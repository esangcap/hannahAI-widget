// server/shopify.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

export async function getOrderStatusByEmail(email) {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-04/orders.json?email=${email}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('❌ Shopify order fetch error:', error);
    return null;
  }
}

export async function getProductInfoByTitle(title) {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-04/products.json?limit=250`; // Fetch first 250

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      }
    });

    const data = await response.json();

    // Try fuzzy matching
    const match = data.products.find(p =>
      p.title.toLowerCase().includes(title.toLowerCase())
    );

    return match ? [match] : [];

  } catch (error) {
    console.error('❌ Shopify product fetch error:', error);
    return [];
  }
}


export async function getProductInfoByHandle(handle) {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-04/products/${handle}.json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN
      }
    });

    const data = await response.json();
    return data.product;
  } catch (error) {
    console.error('❌ Shopify product fetch error:', error);
    return null;
  }
}
