export default function DriverPaymentMethodLegacyRedirect() {
  if (typeof window !== 'undefined') {
    window.location.replace('/driver/profile/payment-method');
  }
  return null;
}

