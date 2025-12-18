
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const PaymentCancelPage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    // If we have a booking ID, trigger the "Failed Payment" email logic
    // which reminds them of the 30 min hold.
    if (bookingId) {
       const sendFailedEmail = async () => {
         try {
           await supabase.functions.invoke('send-transactional-email', {
             body: {
               type: 'bowling',
               action: 'failed', // Trigger failed/incomplete payment email
               bookingId: bookingId,
               data: {}
             }
           });
         } catch(e) { console.error(e); }
       };
       sendFailedEmail();
    }
  }, [bookingId]);

  return (
    <>
      <Helmet>
        <title>Payment Cancelled - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white text-center">
                Payment Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-300">
                Your payment was cancelled. No charges were made.
              </p>
              <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded text-sm text-orange-200">
                <strong>Important:</strong> Your lanes are still held for 30 minutes from the start of your booking attempt. Check your email for details.
              </div>
              <p className="text-sm text-gray-400">
                You can try booking again whenever you're ready.
              </p>
              <div className="space-y-2">
                <Link to="/bowling">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                    Try Again
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
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

export default PaymentCancelPage;
