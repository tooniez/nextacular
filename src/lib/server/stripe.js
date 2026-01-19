import initStripe from 'stripe';

const stripeKey = process.env.PAYMENTS_SECRET_KEY;
const stripe = stripeKey ? initStripe(stripeKey) : null;

export const createCustomer = async (email) => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set PAYMENTS_SECRET_KEY environment variable.');
  }
  return await stripe.customers.create({
    email,
  });
};

export const getInvoices = async (customer) => {
  if (!stripe) {
    return [];
  }
  const invoices = await stripe.invoices.list({ customer });
  return invoices?.data;
};

export const getProducts = async () => {
  if (!stripe) {
    return [];
  }
  const [products, prices] = await Promise.all([
    stripe.products.list(),
    stripe.prices.list(),
  ]);
  const productPrices = {};
  prices?.data.map((price) => (productPrices[price.product] = price));
  products?.data.map((product) => (product.prices = productPrices[product.id]));
  return products?.data.reverse();
};

export default stripe;
