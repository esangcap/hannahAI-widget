// server/routes/chat.js
import express from 'express';
import OpenAI from 'openai';
import { getOrderStatusByEmail, getProductInfoByTitle } from '../shopify.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/', async (req, res) => {
  const { messages } = req.body;
  const latestUserMessage = messages[messages.length - 1]?.text || '';

  let systemPrompt = `
You are Hannah, a friendly customer support assistant for a Shopify store www.glamure.co.uk.
If the user asks to speak with a human, acknowledge their request warmly and let them know someone from the team will reach out shortly.
Also mention they can contact us via email at support@yourstore.com or through Messenger if needed.
Otherwise, answer using the knowledge provided or ask for clarification. Be concise, helpful, and empathetic.
`;

  let additionalContext = '';
  let productDescription = '';

  // 🔍 Detect human request
  const isHumanRequest = /(talk to (a )?human|real person|speak to (an )?agent|live support|customer support)/i.test(latestUserMessage);

  try {
    // 🟡 Order Status
    if (
      latestUserMessage.toLowerCase().includes('track my order') ||
      latestUserMessage.toLowerCase().includes('where is my order')
    ) {
      const emailMatch = latestUserMessage.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,6}/);
      if (emailMatch) {
        const orders = await getOrderStatusByEmail(emailMatch[0]);
        if (orders && orders.length > 0) {
          const order = orders[0];
          additionalContext = `Order #${order.name} was placed on ${order.created_at}. Current status: ${order.fulfillment_status || 'Processing'} via ${order.shipping_lines[0]?.carrier_identifier || 'N/A'} with tracking: ${order.shipping_lines[0]?.tracking_number || 'Unavailable'}`;
        } else {
          additionalContext = `No orders found for email ${emailMatch[0]}.`;
        }
      } else {
        additionalContext = `Can you please provide the email you used to place the order?`;
      }
    }

    // 🟢 Product Info
    if (latestUserMessage.toLowerCase().includes('tell me about')) {
      const productTitle = latestUserMessage.replace(/tell me about/i, '').trim();
      const products = await getProductInfoByTitle(productTitle);
      console.log("🛍️ Shopify returned products:", JSON.stringify(products, null, 2));

      if (products && products.length > 0) {
        const product = products[0];
        const productUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/products/${product.handle}`;
        const stripHTML = html => html.replace(/<[^>]+>/g, '');

        productDescription = `
### 🛍️ ${product.title}

${stripHTML(product.body_html)}

**Price:** €${product.variants[0].price}  
**Sizes Available:**
${product.variants.map(v => `- ${v.title} — €${v.price}`).join('\n')}

[View the product](${productUrl})  
![Product image](${product.image?.src || ''})
`;
      } else {
        additionalContext = `Sorry, I couldn't find any product matching "${productTitle}".`;
      }
    }

    // ✅ Human escalation: short-circuit response
    if (isHumanRequest) {
      return res.json({
        reply: `👋 Absolutely! A member of our support team will reach out shortly.  
You can also email us at **support@yourstore.com** or chat live via [Messenger](https://m.me/yourpage).`
      });
    }

    // 🧠 GPT Completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        {
          role: 'system',
          content: additionalContext || productDescription
        }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error('🔥 OpenAI or Shopify error:', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
});

export default router;
