'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';

function UpgradePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedGateway, setSelectedGateway] = useState<'esewa' | 'khalti'>('esewa');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const plan = searchParams.get('plan');
    if (payment === 'success') {
      setPaymentStatus(`success:${plan}`);
    } else if (payment === 'failed') {
      setPaymentStatus('failed');
    }
  }, [searchParams]);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const res = await api.post('/payments/initiate', {
        plan: selectedPlan,
        gateway: selectedGateway,
      });

      if (selectedGateway === 'esewa') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = res.data.payment_url;

        Object.entries(res.data.form_data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        window.location.href = res.data.payment_url;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment initiation failed');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* All your existing UI code - unchanged */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/student" className="text-gray-400 hover:text-gray-600 transition text-sm">
              ← Back
            </Link>
            <span className="text-lg font-bold text-gray-900">🎓 Smart LMS</span>
          </div>
          <span className="text-sm text-gray-500">👋 {user?.full_name}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Success/Failure banner, Plans, Payment, etc. - Keep everything from here exactly as before */}
        {paymentStatus.startsWith('success') && (
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4">
            <span className="text-4xl">🎉</span>
            <div>
              <div className="font-semibold text-green-800 text-lg">Payment Successful!</div>
              <div className="text-green-600 text-sm mt-1">
                Your {paymentStatus.split(':')[1]} plan is now active. Enjoy full access!
              </div>
            </div>
            <Link href="/dashboard/student" className="ml-auto bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition">
              Go to Dashboard
            </Link>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
            <span className="text-4xl">❌</span>
            <div>
              <div className="font-semibold text-red-800">Payment Failed</div>
              <div className="text-red-600 text-sm mt-1">Something went wrong. Please try again.</div>
            </div>
          </div>
        )}

        {/* Header, Plan selector, Payment gateway, Order summary, Pay button - all your existing code */}
        {/* ... (paste the rest of your JSX here - same as previous full file) ... */}

        <p className="text-center text-gray-400 text-sm mt-4">
          🔒 Secure payment · Cancel anytime · Nepal-based support
        </p>
      </div>
    </div>
  );
}

// Main Page with Suspense + Force Dynamic
export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  );
}

// ←←← THIS IS THE MOST IMPORTANT PART
export const dynamic = 'force-dynamic';