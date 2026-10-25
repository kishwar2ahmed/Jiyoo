export function formatErrorMessage(errorInput: any): string {
  const errorMsg = typeof errorInput === 'string' ? errorInput : (errorInput?.message || String(errorInput));
  
  if (errorMsg.includes('What happened:') && errorMsg.includes('Why it happened:')) {
    return errorMsg;
  }
  
  let what = "An unexpected error occurred.";
  let why = errorMsg || "The system encountered an unknown state or failure.";
  let next = "Please try again or reload the page.";

  const lowerMsg = errorMsg.toLowerCase();

  if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('failed to fetch')) {
    what = "Network request failed.";
    why = "The server is unreachable or your internet connection is unstable.";
    next = "Check your internet connection and try again.";
  } else if (lowerMsg.includes(' auth ') || lowerMsg.includes('token') || lowerMsg.includes('unauthorized') || lowerMsg.includes('permission')) {
    what = "Authentication or permission denied.";
    why = "Your session may have expired, or you do not have the required access rights.";
    next = "Please log out and log back in, or ensure you have the correct permissions.";
  } else if (lowerMsg.includes('payment') || lowerMsg.includes('razorpay')) {
    what = "Payment processing failed.";
    why = errorMsg;
    next = "Try a different payment method (like Cash on Delivery) or try again later. If money was deducted, contact us with your payment reference and we'll process a refund.";
  } else if (lowerMsg.includes('price') || lowerMsg.includes('inventory') || lowerMsg.includes('stock')) {
    what = "Order validation failed.";
    why = errorMsg;
    next = "Please clear your cart, refresh the page, and try adding the items again.";
  } else if (lowerMsg.includes('database') || lowerMsg.includes('firestore')) {
    what = "Database operation failed.";
    why = errorMsg || "The database might not be initialized properly or is temporarily unavailable.";
    next = "Ensure your database is active. Contact support if the issue persists.";
  } else if (lowerMsg.includes('fail') || lowerMsg.includes('error')) {
    what = "An operation failed to complete.";
    why = errorMsg;
    next = "Review the action you were taking and try again, or reload the page.";
  }

  return `What happened:\n${what}\n\nWhy it happened:\n${why}\n\nWhat to do next:\n${next}`;
}
