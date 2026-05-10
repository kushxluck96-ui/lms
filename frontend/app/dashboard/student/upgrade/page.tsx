'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';

export default function UpgradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedGateway, setSelectedGateway] = useState<'esewa' | 'khalti'>('esewa');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

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
        // Submit eSewa form
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
        // Khalti — redirect to payment URL
        window.location.href = res.data.payment_url;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment initiation failed');
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
        {/* Success/Failure banner */}
        {paymentStatus.startsWith('success') && (
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-4">
            <span className="text-4xl">🎉</span>
            <div>
              <div className="font-semibold text-green-800 text-lg">Payment Successful!</div>
              <div className="text-green-600 text-sm mt-1">
                Your {paymentStatus.split(':')[1]} plan is now active. Enjoy full access!
              </div>
            </div>
            <Link
              href="/dashboard/student"
              className="ml-auto bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
            <span className="text-4xl">❌</span>
            <div>
              <div className="font-semibold text-red-800">Payment Failed</div>
              <div className="text-red-600 text-sm mt-1">
                Something went wrong. Please try again.
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium mb-4">
            🚀 Upgrade to Premium
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Unlock Your Full Learning Potential
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Get unlimited access to all courses, live classes, and exclusive content.
          </p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-6 rounded-2xl border-2 text-left transition ${
              selectedPlan === 'monthly'
                ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Monthly Plan</div>
                <div className="text-gray-500 text-sm mt-1">Perfect to get started</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
              }`}>
                {selectedPlan === 'monthly' && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">NPR 999</span>
              <span className="text-gray-500">/month</span>
            </div>
            <div className="mt-4 space-y-2">
              {['All courses unlocked', 'Live class access', 'Progress tracking', 'Certificates'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </div>
              ))}
            </div>
          </button>

          {/* Yearly */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`p-6 rounded-2xl border-2 text-left transition relative ${
              selectedPlan === 'yearly'
                ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="absolute -top-3 left-6">
              <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Save 25%
              </span>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-gray-900 text-lg">Yearly Plan</div>
                <div className="text-gray-500 text-sm mt-1">Best value for serious learners</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
              }`}>
                {selectedPlan === 'yearly' && <span className="text-white text-xs">✓</span>}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">NPR 8,999</span>
              <span className="text-gray-500">/year</span>
            </div>
            <div className="text-green-600 text-sm mt-1 font-medium">
              Equivalent to NPR 750/month
            </div>
            <div className="mt-4 space-y-2">
              {['Everything in Monthly', 'Priority support', 'Offline downloads', 'Early access to new courses'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* Payment gateway selector */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="font-semibold text-gray-900 mb-4">Choose Payment Method</div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedGateway('esewa')}
              className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${
                selectedGateway === 'esewa'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                eS
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">eSewa</div>
                <div className="text-xs text-gray-500">Nepal's #1 wallet</div>
              </div>
              {selectedGateway === 'esewa' && (
                <span className="ml-auto text-green-500">✓</span>
              )}
            </button>

            <button
              onClick={() => setSelectedGateway('khalti')}
              className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${
                selectedGateway === 'khalti'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                K
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Khalti</div>
                <div className="text-xs text-gray-500">Digital wallet</div>
              </div>
              {selectedGateway === 'khalti' && (
                <span className="ml-auto text-purple-500">✓</span>
              )}
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="font-semibold text-gray-900 mb-4">Order Summary</div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{selectedPlan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}</span>
            <span>NPR {selectedPlan === 'monthly' ? '999' : '8,999'}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>Tax</span>
            <span>NPR 0</span>
          </div>
          <div className="border-t border-gray-100 pt-4 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span className="text-indigo-600 text-lg">
              NPR {selectedPlan === 'monthly' ? '999' : '8,999'}
            </span>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {paying ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Redirecting to {selectedGateway === 'esewa' ? 'eSewa' : 'Khalti'}...
            </>
          ) : (
            <>
              Pay NPR {selectedPlan === 'monthly' ? '999' : '8,999'} with{' '}
              {selectedGateway === 'esewa' ? 'eSewa' : 'Khalti'} →
            </>
          )}
        </button>

        <p className="text-center text-gray-400 text-sm mt-4">
          🔒 Secure payment · Cancel anytime · Nepal-based support
        </p>
      </div>
    </div>
  );
}