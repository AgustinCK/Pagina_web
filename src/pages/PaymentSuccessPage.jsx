
import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Landmark, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [emailStatus, setEmailStatus] = useState('sending');
  const effectRan = useRef(false);

  useEffect(() => {
    // React 18 strict mode double-invoke guard
    if (effectRan.current) return;
    effectRan.current = true;

    const params = new URLSearchParams(location.search);
    const payMethod = params.get('method') || 'card';
    const totalAmount = params.get('amount') || '';
    const bookingId = params.get('bookingId'); // Passed from previous step if available

    setMethod(payMethod);
    setAmount(totalAmount);

    const sendConfirmationEmails = async () => {
      // In a real app, you'd get the ID safely. Here we use a query param or lookup
      // For this implementation, we will assume we have an ID or can't send.
      // Since BowlingBookingPage didn't pass ID in query in previous step, we need to fix that file 
      // OR we just simulate for now if ID is missing (to prevent crash).
      
      if (!bookingId) {
        setEmailStatus('no_id');
        return; 
      }

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            type: 'bowling',
            action: 'confirmed',
            bookingId: bookingId,
            data: { totalPrice: totalAmount }
          }
        });
        setEmailStatus('sent');
      } catch (err) {
        console.error('Email failed', err);
        setEmailStatus('error');
      }
    };

    if (payMethod === 'card') {
      sendConfirmationEmails();
      // Redirect timer
      const timer = setTimeout(() => {
        navigate('/');
      }, 10000); // Increased time to see message
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  const renderContent = () => {
    switch (method) {
      case 'transfer':
        return (
          <div className="space-y-4">
             <div className="bg-white/10 rounded-lg p-4 text-left border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                <Landmark className="mr-2 h-5 w-5 text-green-400" />
                Bank Transfer Details
              </h3>
              <div className="text-gray-300 space-y-1 text-sm">
                <p><span className="text-gray-500">Bank:</span> GoldBank International</p>
                <p><span className="text-gray-500">Account Name:</span> Goldgrube Bowling Center</p>
                <p><span className="text-gray-500">IBAN:</span> DE89 3704 0044 0532 0130 00</p>
                <p><span className="text-gray-500">BIC/SWIFT:</span> GOLDBK55</p>
                <p className="mt-2 font-bold text-white">Amount: €{amount}</p>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
              <p className="text-sm text-yellow-200 text-left">
                Your booking is <strong>PENDING</strong>. Please transfer within 24h.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <p className="text-gray-300">
              Your booking is confirmed and payment processed.
            </p>
            <div className="my-4 p-3 bg-blue-500/10 rounded text-blue-200 text-sm">
               {emailStatus === 'sending' && <span className="flex items-center justify-center"><Loader2 className="w-3 h-3 animate-spin mr-2"/> Sending confirmation emails...</span>}
               {emailStatus === 'sent' && <span className="flex items-center justify-center"><CheckCircle className="w-3 h-3 mr-2"/> Confirmation email sent!</span>}
               {emailStatus === 'error' && <span>Email sending failed, but your booking is safe.</span>}
               {emailStatus === 'no_id' && <span>Booking ID missing in redirect, skipping email.</span>}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Redirecting automatically in 10 seconds...
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        <title>Payment Status - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white text-center">
                {method === 'transfer' ? 'Booking Reserved' : 'Success!'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {renderContent()}
              <div className="pt-2">
                <Link to="/">
                  <Button className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default PaymentSuccessPage;
