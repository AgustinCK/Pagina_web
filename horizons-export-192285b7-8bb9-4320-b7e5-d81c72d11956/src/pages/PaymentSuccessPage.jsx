import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Landmark, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const VENUE_TIMEZONE = 'Europe/Berlin';

function formatDateTime(ts, timeZone = VENUE_TIMEZONE) {
  if (!ts) return '';
  const d = new Date(ts);
  const date = d.toLocaleDateString('de-DE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString('de-DE', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

function minutesBetween(startTs, endTs) {
  if (!startTs || !endTs) return 0;
  const ms = new Date(endTs) - new Date(startTs);
  return Math.max(0, Math.round(ms / 60000));
}

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [method, setMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | sent | error | no_token
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  const effectRan = useRef(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token');
  }, [location.search]);

  useEffect(() => {
    // React 18 strict mode double-invoke guard
    if (effectRan.current) return;
    effectRan.current = true;

    const params = new URLSearchParams(location.search);
    const payMethod = params.get('method') || 'card';
    const totalAmount = params.get('amount') || '';
    setMethod(payMethod);
    setAmount(totalAmount);

    const loadBooking = async () => {
      if (!token) {
        setBookingError('Missing token in URL. Please return to booking and try again.');
        setLoadingBooking(false);
        setEmailStatus('no_token');
        return;
      }

      setLoadingBooking(true);
      setBookingError(null);

      try {
        const { data, error } = await supabase.rpc('get_booking_by_token', { p_token: token });
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.id) throw new Error('Booking not found for this token.');

        setBooking(row);

        // If URL amount missing, use DB snapshot
        if (!totalAmount && row?.calculated_amount != null) {
          setAmount(Number(row.calculated_amount).toFixed(2));
        }

        // NOTE: Emails should be sent only when payment is truly confirmed (Stripe webhook).
        // For now we do NOT send emails here, because payment isn't connected yet.
        setEmailStatus('idle');

        // Redirect timer (keep your existing behavior)
        const timer = setTimeout(() => {
          navigate('/');
        }, 10000);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error(err);
        setBookingError(err.message || String(err));
      } finally {
        setLoadingBooking(false);
      }
    };

    loadBooking();
  }, [location, navigate, token]);

  const renderBookingSummary = () => {
    if (loadingBooking) {
      return (
        <div className="my-4 p-3 bg-blue-500/10 rounded text-blue-200 text-sm">
          <span className="flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin mr-2" /> Loading booking details...
          </span>
        </div>
      );
    }

    if (bookingError) {
      return (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            <p className="text-sm text-red-200 text-left">{bookingError}</p>
          </div>
          <p className="text-xs text-gray-500">
            If you think this is a mistake, please contact us with your name and email.
          </p>
        </div>
      );
    }

    if (!booking) return null;

    const start = formatDateTime(booking.start_at, VENUE_TIMEZONE);
    const end = formatDateTime(booking.end_at, VENUE_TIMEZONE);
    const durationMin = minutesBetween(booking.start_at, booking.end_at);
    const lanes = Array.isArray(booking.assigned_resources) ? booking.assigned_resources : [];
    const lanesLabel = lanes.length ? lanes.map((x) => x.name).join(', ') : 'Assigned at venue';

    const statusLabel =
      booking.status === 'hold'
        ? 'RESERVED (pending payment)'
        : booking.status === 'confirmed'
          ? 'CONFIRMED'
          : booking.status === 'hold_expired'
            ? 'EXPIRED'
            : String(booking.status || '').toUpperCase();

    return (
      <div className="space-y-3">
        <div className="bg-white/10 rounded-lg p-4 text-left border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
            Booking Details
          </h3>

          <div className="text-gray-300 space-y-1 text-sm">
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              <span className={booking.status === 'confirmed' ? 'text-green-300 font-semibold' : 'text-yellow-200 font-semibold'}>
                {statusLabel}
              </span>
            </p>

            <p>
              <span className="text-gray-500">Start:</span> {start}
            </p>
            <p>
              <span className="text-gray-500">End:</span> {end}
            </p>
            <p>
              <span className="text-gray-500">Duration:</span> {durationMin} min
            </p>
            <p>
              <span className="text-gray-500">Lanes:</span> {lanesLabel}
            </p>

            <p className="mt-2 font-bold text-white">
              Amount: €{amount || (booking.calculated_amount != null ? Number(booking.calculated_amount).toFixed(2) : '—')}
            </p>
          </div>
        </div>

        {booking.status === 'hold' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <p className="text-sm text-yellow-200 text-left">
              Your booking is <strong>RESERVED</strong>. Please complete payment before the hold expires.
            </p>
          </div>
        )}

        <div className="my-2 p-3 bg-blue-500/10 rounded text-blue-200 text-sm">
          {emailStatus === 'sending' && (
            <span className="flex items-center justify-center">
              <Loader2 className="w-3 h-3 animate-spin mr-2" /> Sending confirmation emails...
            </span>
          )}
          {emailStatus === 'sent' && (
            <span className="flex items-center justify-center">
              <CheckCircle className="w-3 h-3 mr-2" /> Confirmation email sent!
            </span>
          )}
          {emailStatus === 'error' && <span>Email sending failed, but your booking is safe.</span>}
          {emailStatus === 'idle' && <span>We&apos;ll send confirmation emails when payments are connected.</span>}
          {emailStatus === 'no_token' && <span>Token missing, could not load booking.</span>}
        </div>

        <p className="text-xs text-gray-500 mt-4">Redirecting automatically in 10 seconds...</p>
      </div>
    );
  };

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

            {renderBookingSummary()}
          </div>
        );

      default:
        // card/paypal - still show details (payment is not truly connected yet)
        return (
          <div className="space-y-2">
            <p className="text-gray-300">
              {booking?.status === 'confirmed'
                ? 'Your booking is confirmed and payment processed.'
                : 'Your booking is reserved. Payment connection will be added soon.'}
            </p>

            {renderBookingSummary()}
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
                  {method === 'transfer' ? (
                    <Wallet className="w-12 h-12 text-green-400" />
                  ) : (
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  )}
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