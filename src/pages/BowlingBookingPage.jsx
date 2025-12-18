
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, CreditCard, Wallet, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const STEPS = {
  1: 'Select Time & Lanes',
  2: 'Your Details',
  3: 'Payment'
};

const BowlingBookingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Hold Logic
  const [holdToken, setHoldToken] = useState(null);
  const [holdExpiry, setHoldExpiry] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '',
    duration: '15',
    laneCount: '1',
    selectedLanes: [],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    numberOfPeople: '4',
    specialRequests: ''
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const OPEN_HOUR = 13;
  const CLOSE_HOUR = 22;
  const TOTAL_LANES = 8;
  const HOLD_DURATION_MINUTES = 30;

  useEffect(() => {
    const cleanup = async () => {
      await supabase.from('bowling_lane_holds').delete().lt('expires_at', new Date().toISOString());
    };
    cleanup();
  }, []);

  useEffect(() => {
    if (formData.bookingDate && formData.duration && formData.laneCount) {
      calculateAvailableSlots();
    }
  }, [formData.bookingDate, formData.duration, formData.laneCount]);

  const calculateAvailableSlots = async () => {
    setCheckingSlots(true);
    setAvailableSlots([]);
    setFormData(prev => ({ ...prev, startTime: '', selectedLanes: [] })); 

    try {
      const slots = [];
      let currentMin = OPEN_HOUR * 60;
      const endLimit = CLOSE_HOUR * 60;
      const duration = parseInt(formData.duration);
      const now = new Date();
      const isToday = formData.bookingDate === now.toISOString().split('T')[0];
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      while (currentMin + duration <= endLimit) {
        if (!isToday || currentMin > nowMinutes + 15) {
          slots.push(currentMin);
        }
        currentMin += 15;
      }

      if (slots.length === 0) {
        setCheckingSlots(false);
        return;
      }

      const { data: bookings } = await supabase.from('bowling_lane_bookings').select('lane_number, start_time, end_time').eq('booking_date', formData.bookingDate).neq('booking_status', 'cancelled');
      const { data: holds } = await supabase.from('bowling_lane_holds').select('lane_number, start_time, end_time').eq('booking_date', formData.bookingDate).gt('expires_at', new Date().toISOString());

      const busyMap = {};
      for (let i = 1; i <= TOTAL_LANES; i++) busyMap[i] = [];

      const addToMap = (item) => {
        const [sH, sM] = item.start_time.split(':').map(Number);
        const [eH, eM] = item.end_time.split(':').map(Number);
        busyMap[item.lane_number].push({ start: sH * 60 + sM, end: eH * 60 + eM });
      };

      bookings?.forEach(addToMap);
      holds?.forEach(addToMap);

      const validSlots = slots.map(slotStart => {
        const slotEnd = slotStart + duration;
        const freeLanes = [];

        for (let lane = 1; lane <= TOTAL_LANES; lane++) {
          const isBusy = busyMap[lane].some(range => slotStart < range.end && slotEnd > range.start);
          if (!isBusy) freeLanes.push(lane);
        }

        if (freeLanes.length >= parseInt(formData.laneCount)) {
          const h = Math.floor(slotStart / 60).toString().padStart(2, '0');
          const m = (slotStart % 60).toString().padStart(2, '0');
          return {
            timeLabel: `${h}:${m}`,
            lanes: freeLanes.slice(0, parseInt(formData.laneCount)) 
          };
        }
        return null;
      }).filter(Boolean);

      setAvailableSlots(validSlots);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error checking availability', description: err.message });
    } finally {
      setCheckingSlots(false);
    }
  };

  const calculateTotal = () => {
    if (!formData.bookingDate) return '0.00';
    const isWeekend = (date) => { const d = new Date(date).getDay(); return d === 5 || d === 6; };
    const pricePerHour = isWeekend(formData.bookingDate) ? 18 : 15;
    const durationHours = parseInt(formData.duration) / 60;
    const lanes = parseInt(formData.laneCount) || 1;
    return (pricePerHour * durationHours * lanes).toFixed(2);
  };

  const handleHoldAndContinue = async () => {
    if (!formData.startTime) {
      toast({ variant: 'destructive', title: 'Select a time' });
      return;
    }
    setLoading(true);
    try {
      const slot = availableSlots.find(s => s.timeLabel === formData.startTime);
      if (!slot) throw new Error("Selected time is no longer available.");
      const lanesToHold = slot.lanes; 
      
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = startMins + parseInt(formData.duration);
      const endTimeStr = `${Math.floor(endMins/60).toString().padStart(2,'0')}:${(endMins%60).toString().padStart(2,'0')}`;
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60000).toISOString();

      const holdRecords = lanesToHold.map(laneNum => ({
        hold_token: newToken,
        lane_number: laneNum,
        booking_date: formData.bookingDate,
        start_time: formData.startTime,
        end_time: endTimeStr,
        expires_at: expiresAt
      }));

      const { error } = await supabase.from('bowling_lane_holds').insert(holdRecords);
      if (error) throw new Error("Conflict detected. Please refresh.");

      setHoldToken(newToken);
      setHoldExpiry(new Date(expiresAt));
      setFormData(prev => ({ ...prev, selectedLanes: lanesToHold }));
      setCurrentStep(2);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Hold Failed', description: error.message });
      calculateAvailableSlots();
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      if (!holdToken) throw new Error("Session expired. Please start over.");

      const [startH, startM] = formData.startTime.split(':').map(Number);
      const totalMins = startH * 60 + startM + parseInt(formData.duration);
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      const totalPrice = calculateTotal();
      
      // Create bookings with PENDING payment status, but 'confirmed' logic waiting for payment
      const bookingsToInsert = formData.selectedLanes.map(laneNum => ({
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        number_of_people: Math.ceil(parseInt(formData.numberOfPeople) / formData.selectedLanes.length),
        booking_date: formData.bookingDate,
        start_time: formData.startTime,
        end_time: endTime,
        lane_number: laneNum,
        special_requests: formData.specialRequests,
        total_price: (parseFloat(totalPrice) / formData.selectedLanes.length).toFixed(2), 
        payment_status: 'pending',
        booking_status: 'confirmed', 
        payment_method: paymentMethod,
        stripe_payment_id: holdToken,
        // We set initial email log empty
        email_logs: {}
      }));

      const { data, error } = await supabase
        .from('bowling_lane_bookings')
        .insert(bookingsToInsert)
        .select();

      if (error) throw error;
      
      // Cleanup holds
      await supabase.from('bowling_lane_holds').delete().eq('hold_token', holdToken);

      // We need just one ID for the redirect to trigger the email
      const primaryBookingId = data[0].id;
      
      // Redirect to Payment Success (simulating Stripe success url)
      // Pass bookingId so the success page can trigger the email
      navigate(`/payment-success?method=${paymentMethod === 'stripe' ? 'card' : 'paypal'}&amount=${totalPrice}&bookingId=${primaryBookingId}`);

    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Booking Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = () => {
    if (!holdExpiry) return null;
    const diff = holdExpiry - new Date();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Helmet>
        <title>Book Kegelbahn - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
             <Link to="/">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Button>
            </Link>
            {currentStep > 1 && (
               <div className="text-sm font-mono text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded border border-yellow-500/30 flex items-center">
                  <Clock className="w-3 h-3 mr-2" />
                  Time to complete: {formatTimeRemaining()}
               </div>
            )}
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex justify-center mb-8 gap-4">
              {[1, 2, 3].map(step => (
                <div key={step} className={`flex items-center gap-2 ${currentStep >= step ? 'text-purple-400' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                    currentStep >= step ? 'border-purple-500 bg-purple-500/20' : 'border-gray-700 bg-gray-800'
                  }`}>
                    {step}
                  </div>
                  <span className="hidden sm:inline font-medium text-sm">{STEPS[step]}</span>
                </div>
              ))}
            </div>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="border-b border-white/10 bg-black/20">
                <CardTitle className="text-2xl text-white">{STEPS[currentStep]}</CardTitle>
                <CardDescription className="text-gray-400">
                  {currentStep === 1 ? 'Configure your session and find a slot.' : 
                   currentStep === 2 ? 'We held your lanes! Enter details.' : 
                   'Review and pay securely.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white">Date</Label>
                          <Input type="date" min={new Date().toISOString().split('T')[0]} value={formData.bookingDate} onChange={e => setFormData({ ...formData, bookingDate: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Duration</Label>
                          <select value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white">
                            {[15,30,45,60,90,120].map(m => <option key={m} value={m} className="text-black">{m} Min</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Lanes</Label>
                          <select value={formData.laneCount} onChange={e => setFormData({ ...formData, laneCount: e.target.value })} className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white">
                            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n} className="text-black">{n}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Price Estimate</Label>
                          <div className="h-10 flex items-center px-3 rounded-md bg-white/5 border border-white/10 text-purple-300 font-mono font-bold">€{calculateTotal()}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Select Start Time</Label>
                        {checkingSlots ? (
                          <div className="flex items-center text-gray-400 py-8 justify-center"><Loader2 className="w-6 h-6 animate-spin mr-2" /> checking...</div>
                        ) : availableSlots.length === 0 ? (
                          <div className="text-red-400 bg-red-900/10 border border-red-500/20 p-4 rounded text-center">No slots available.</div>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {availableSlots.map((slot) => (
                              <button key={slot.timeLabel} onClick={() => setFormData({ ...formData, startTime: slot.timeLabel })} className={`px-2 py-3 text-sm font-medium rounded-md border transition-all ${formData.startTime === slot.timeLabel ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                                {slot.timeLabel}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button onClick={handleHoldAndContinue} disabled={!formData.startTime || loading} className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white h-12 px-8 text-lg">
                          {loading ? <Loader2 className="animate-spin" /> : 'Continue'} <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className="text-white">Name</Label><Input required value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="bg-white/10 border-white/20 text-white" /></div>
                        <div className="space-y-2"><Label className="text-white">Email</Label><Input type="email" required value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} className="bg-white/10 border-white/20 text-white" /></div>
                        <div className="space-y-2"><Label className="text-white">Phone</Label><Input type="tel" required value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} className="bg-white/10 border-white/20 text-white" /></div>
                        <div className="space-y-2"><Label className="text-white">Guests</Label><Input type="number" required value={formData.numberOfPeople} onChange={e => setFormData({ ...formData, numberOfPeople: e.target.value })} className="bg-white/10 border-white/20 text-white" /></div>
                      </div>
                      <div className="space-y-2"><Label className="text-white">Special Requests</Label><Textarea value={formData.specialRequests} onChange={e => setFormData({ ...formData, specialRequests: e.target.value })} className="bg-white/10 border-white/20 text-white min-h-[80px]" /></div>
                      <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={() => setCurrentStep(1)} className="text-gray-400">Cancel</Button>
                        <Button onClick={() => formData.customerName && formData.customerEmail ? setCurrentStep(3) : toast({variant: "destructive", title: "Missing fields"})} className="bg-purple-600 text-white px-8">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-300">
                           <span>Date: {formData.bookingDate}</span><span className="text-right">Time: {formData.startTime}</span>
                           <span>Lanes: {formData.laneCount}</span><span className="text-right">Price: €{calculateTotal()}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-white">Method</Label>
                        <div className="grid grid-cols-2 gap-4">
                           <div onClick={() => setPaymentMethod('stripe')} className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center ${paymentMethod === 'stripe' ? 'border-purple-500 bg-white/5' : 'border-white/10'}`}><CreditCard className="w-6 h-6 text-purple-400" /><span>Card</span></div>
                           <div onClick={() => setPaymentMethod('paypal')} className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center ${paymentMethod === 'paypal' ? 'border-blue-500 bg-white/5' : 'border-white/10'}`}><Wallet className="w-6 h-6 text-blue-400" /><span>PayPal</span></div>
                        </div>
                      </div>
                      <div className="flex justify-between pt-4">
                         <Button variant="ghost" onClick={() => setCurrentStep(2)} className="text-gray-400">Back</Button>
                        <Button onClick={handleBook} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-8">
                           {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />} Pay & Confirm
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BowlingBookingPage;
