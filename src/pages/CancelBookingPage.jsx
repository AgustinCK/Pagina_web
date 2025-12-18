
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, Calendar, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CancelBookingPage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const { toast } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    if (!bookingId) {
      setError('Invalid booking ID');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bowling_lane_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
      checkCancellationValidity(data);
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Booking not found or already cancelled');
    } finally {
      setLoading(false);
    }
  };

  const checkCancellationValidity = (bookingData) => {
    if (bookingData.booking_status === 'cancelled') {
      setError('This booking is already cancelled.');
      setCanCancel(false);
      return;
    }

    const bookingDateTime = new Date(`${bookingData.booking_date}T${bookingData.start_time}`);
    const now = new Date();
    const diffMs = bookingDateTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 8) {
      setCanCancel(true);
      setTimeRemaining(`${Math.floor(diffHours)} hours`);
    } else {
      setCanCancel(false);
      setError('Cancellations are only allowed more than 8 hours before the reservation.');
    }
  };

  const handleCancel = async () => {
    // Removed native confirm() to fix lint error and improve UX
    setCancelling(true);
    try {
      // Call Edge Function to handle secure cancellation and refund
      const { data, error } = await supabase.functions.invoke('process-cancellation', {
        body: { bookingId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Failed to cancel');

      setSuccess(true);
      toast({
        title: "Booking Cancelled",
        description: "Your refund has been initiated.",
      });
    } catch (err) {
      console.error('Cancellation error:', err);
      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: err.message || "Could not cancel booking. Please contact support.",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cancel Booking - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white text-center">Cancel Reservation</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Manage your booking #{bookingId?.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {success ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Cancellation Confirmed</h3>
                  <p className="text-gray-300">
                    Your booking has been cancelled. A refund has been initiated to your original payment method.
                  </p>
                  <p className="text-sm text-gray-400">
                    A confirmation email has been sent to {booking?.customer_email}.
                  </p>
                  <Link to="/">
                    <Button className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white">
                      Return Home
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="bg-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center text-gray-200">
                      <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                      <span>{booking?.booking_date}</span>
                    </div>
                    <div className="flex items-center text-gray-200">
                      <Clock className="w-4 h-4 mr-2 text-purple-400" />
                      <span>{booking?.start_time} - {booking?.end_time}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span className="text-gray-400">Lane {booking?.lane_number}</span>
                      <span className="text-white font-bold">${booking?.total_price}</span>
                    </div>
                  </div>

                  {!canCancel && !success ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-semibold text-red-400">Cannot Cancel</h4>
                        <p className="text-sm text-red-200/80">
                          {error || "Reservations can only be cancelled at least 8 hours in advance."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-semibold text-yellow-400">Warning</h4>
                          <p className="text-sm text-yellow-200/80">
                            You are about to cancel this reservation. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            disabled={cancelling}
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                          >
                            {cancelling ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing Refund...</>
                            ) : (
                              'Confirm Cancellation & Refund'
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              This action cannot be undone. This will permanently cancel your booking and initiate a refund to your original payment method.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700 text-white border-none">Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  <Link to="/">
                    <Button variant="ghost" className="w-full text-gray-400 hover:text-white">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Keep Booking
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default CancelBookingPage;
