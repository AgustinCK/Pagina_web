import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, Loader2, CreditCard, Wallet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const STEPS = {
  1: 'Select Time & Lanes',
  2: 'Your Details',
  3: 'Payment',
};

// Goldgrube (single venue)
const VENUE_ID = 'ab4492ab-1f45-4603-a05b-78f0cd5cb6c2';

function toISODateLocal(d = new Date()) {
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
}

function addDaysISO(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
}

function makeDurationOptions(minMinutes, maxMinutes, stepMinutes) {
  const out = [];
  const min = Math.max(1, Number(minMinutes || 60));
  const max = Math.max(min, Number(maxMinutes || min));
  const step = Math.max(1, Number(stepMinutes || 60));
  for (let m = min; m <= max; m += step) out.push(m);
  return out;
}

function hhmmFromTimestamptz(ts, timeZone) {
  return new Date(ts).toLocaleTimeString([], {
    timeZone: timeZone || 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const BowlingBookingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Public config (from RPC)
  const [cfgLoading, setCfgLoading] = useState(true);
  const [cfg, setCfg] = useState(null);

  // Grid slots from RPC
  const [availableSlots, setAvailableSlots] = useState([]); // [{startAt,endAt,timeLabel,estimatedAmount,availableLanes}]
  const [checkingSlots, setCheckingSlots] = useState(false);

  // HOLD / token state
  const [holdToken, setHoldToken] = useState(null);
  const [holdExpiry, setHoldExpiry] = useState(null);
  const [holdBookingId, setHoldBookingId] = useState(null);
  const [holdAmount, setHoldAmount] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('stripe');

  // Form Data (UI stays same)
  const [formData, setFormData] = useState({
    bookingDate: toISODateLocal(new Date()),
    startTime: '',
    duration: '60',
    laneCount: '1',

    customerName: '',
    customerEmail: '',
    customerPhone: '',
    numberOfPeople: '4',
    specialRequests: '',
  });

  // ---- Load public config once ----
  useEffect(() => {
    (async () => {
      setCfgLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_public_booking_config', {
          p_venue_id: VENUE_ID,
        });
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.venue_id) throw new Error('Missing config from DB.');

        setCfg(row);

        // Make sure duration default is valid
        const opts = makeDurationOptions(
          row.lane_min_duration_minutes,
          row.lane_max_duration_minutes,
          row.slot_increment_minutes
        );
        const defaultDur = String(opts[0] ?? 60);
        setFormData((p) => ({
          ...p,
          duration: opts.includes(parseInt(p.duration, 10)) ? p.duration : defaultDur,
          laneCount: p.laneCount,
        }));
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Failed to load booking config',
          description: err.message || String(err),
        });
      } finally {
        setCfgLoading(false);
      }
    })();
  }, [toast]);

  const minDate = useMemo(() => toISODateLocal(new Date()), []);
  const maxDate = useMemo(() => {
    const days = Number(cfg?.max_days_in_future ?? 90);
    return addDaysISO(minDate, Math.max(1, days));
  }, [cfg?.max_days_in_future, minDate]);

  const durationOptions = useMemo(() => {
    return makeDurationOptions(
      cfg?.lane_min_duration_minutes,
      cfg?.lane_max_duration_minutes,
      cfg?.slot_increment_minutes
    );
  }, [cfg]);

  const maxLanes = useMemo(() => {
    const n = Number(cfg?.active_lanes_count ?? 8);
    return Math.max(1, n);
  }, [cfg?.active_lanes_count]);

  // ---- Fetch availability grid when date/duration/laneCount changes ----
  useEffect(() => {
    if (cfgLoading) return;
    if (!cfg) return;
    if (!formData.bookingDate || !formData.duration || !formData.laneCount) return;

    // reset selection when inputs change
    setAvailableSlots([]);
    setFormData((p) => ({ ...p, startTime: '' }));

    void fetchGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgLoading, cfg?.venue_id, formData.bookingDate, formData.duration, formData.laneCount]);

  const fetchGrid = async () => {
    setCheckingSlots(true);
    setAvailableSlots([]);
    try {
      const durationMin = parseInt(formData.duration, 10);
      const lanesRequested = parseInt(formData.laneCount, 10);

      const { data, error } = await supabase.rpc('get_lane_availability_grid', {
        p_venue_id: VENUE_ID,
        p_date: formData.bookingDate,
        p_duration_minutes: durationMin,
        p_lanes_requested: lanesRequested,
      });
      if (error) throw error;

      const slots = (data || []).map((row) => ({
        startAt: row.start_at,
        endAt: row.end_at,
        timeLabel: hhmmFromTimestamptz(row.start_at, cfg?.timezone),
        estimatedAmount: row.estimated_amount,
        availableLanes: row.available_lanes,
      }));

      setAvailableSlots(slots);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error checking availability',
        description: err.message || String(err),
      });
    } finally {
      setCheckingSlots(false);
    }
  };

  // ---- Price shown in UI: based on selected timeLabel ----
  const calculateTotal = () => {
    const slot = availableSlots.find((s) => s.timeLabel === formData.startTime);
    const n = Number(slot?.estimatedAmount ?? holdAmount ?? 0);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  };

  // ---- Create HOLD at step1 -> move to step2 (same UX as your original) ----
  const handleHoldAndContinue = async () => {
    if (!cfg) {
      toast({ variant: 'destructive', title: 'Missing config' });
      return;
    }
    if (!formData.startTime) {
      toast({ variant: 'destructive', title: 'Select a time' });
      return;
    }

    setLoading(true);
    try {
      const slot = availableSlots.find((s) => s.timeLabel === formData.startTime);
      if (!slot?.startAt) throw new Error('Selected time is no longer available. Please choose another.');

      const durationMin = parseInt(formData.duration, 10);
      const lanesRequested = parseInt(formData.laneCount, 10);
      const partySize = Math.max(1, parseInt(formData.numberOfPeople || '1', 10));

      const { data, error } = await supabase.rpc('create_lane_booking_hold', {
        p_venue_id: VENUE_ID,
        p_start_at: slot.startAt,
        p_duration_minutes: durationMin,
        p_lanes_requested: lanesRequested,

        // placeholders allowed; you collect real details step2 (same UX)
        p_customer_name: 'HOLD',
        p_customer_email: 'HOLD',
        p_customer_phone: 'HOLD',
        p_party_size: partySize,
        p_notes_customer: formData.specialRequests || null,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.public_token || !row?.hold_expires_at || !row?.booking_id) {
        throw new Error('Hold created but missing token/expiry.');
      }

      setHoldToken(row.public_token);
      setHoldExpiry(new Date(row.hold_expires_at));
      setHoldBookingId(row.booking_id);
      setHoldAmount(row.estimated_amount);


      try {
        await supabase.functions.invoke('send-hold-email', {
          body: {
            token: row.public_token,
            // baseUrl opcional: solo si NO configuraste PUBLIC_BASE_URL en secrets
            // baseUrl: window.location.origin,
          },
        });
      } catch (e) {
        console.warn('send-hold-email failed (non-blocking):', e);
      }
      
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Hold Failed',
        description: err.message || String(err),
      });
      await fetchGrid();
    } finally {
      setLoading(false);
    }
  };

  // ---- Final “Book”: for now we only navigate with token/bookingId (payments later) ----
  const handleBook = async () => {
    setLoading(true);
    try {
      if (!holdExpiry || holdExpiry <= new Date()) {
        throw new Error('Session expired. Please start over.');
      }
      if (!holdToken || !holdBookingId) {
        throw new Error('Missing hold. Please start over.');
      }

      // NOTE: when we implement payments, this becomes “start checkout”.
      navigate(
        `/payment-success?method=${paymentMethod === 'stripe' ? 'card' : 'paypal'
        }&amount=${calculateTotal()}&bookingId=${holdBookingId}&token=${encodeURIComponent(holdToken)}`
      );
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: err.message || String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = () => {
    if (!holdExpiry) return null;
    const diff = holdExpiry - new Date();
    if (diff <= 0) return 'Expired';
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-8 gap-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className={`flex items-center gap-2 ${currentStep >= step ? 'text-purple-400' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${currentStep >= step ? 'border-purple-500 bg-purple-500/20' : 'border-gray-700 bg-gray-800'
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
                  {currentStep === 1
                    ? 'Configure your session and find a slot.'
                    : currentStep === 2
                      ? 'We held your lanes! Enter details.'
                      : 'Review and pay securely.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white">Datum</Label>
                          <Input
                            type="date"
                            min={minDate}
                            max={maxDate}
                            value={formData.bookingDate}
                            onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                            disabled={cfgLoading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Dauer</Label>
                          <select
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white"
                            disabled={cfgLoading}
                          >
                            {durationOptions.map((m) => (
                              <option key={m} value={m} className="text-black">
                                {m} Min
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Anzahl der Kegelbahnen</Label>
                          <select
                            value={formData.laneCount}
                            onChange={(e) => setFormData({ ...formData, laneCount: e.target.value })}
                            className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white"
                            disabled={cfgLoading}
                          >
                            {Array.from({ length: maxLanes }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n} className="text-black">
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Preisübersicht</Label>
                          <div className="h-10 flex items-center px-3 rounded-md bg-white/5 border border-white/10 text-purple-300 font-mono font-bold">
                            €{calculateTotal()}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Startzeit auswählen</Label>

                        {cfgLoading ? (
                          <div className="flex items-center text-gray-400 py-8 justify-center">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> loading config...
                          </div>
                        ) : checkingSlots ? (
                          <div className="flex items-center text-gray-400 py-8 justify-center">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> checking...
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="text-red-400 bg-red-900/10 border border-red-500/20 p-4 rounded text-center">
                            No slots available.
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.startAt}
                                onClick={() => setFormData({ ...formData, startTime: slot.timeLabel })}
                                className={`px-2 py-3 text-sm font-medium rounded-md border transition-all ${formData.startTime === slot.timeLabel
                                    ? 'bg-purple-600 border-purple-400 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-300'
                                  }`}
                              >
                                {slot.timeLabel}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={handleHoldAndContinue}
                          disabled={!formData.startTime || loading || cfgLoading}
                          className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white h-12 px-8 text-lg"
                        >
                          {loading ? <Loader2 className="animate-spin" /> : 'Continue'}{' '}
                          <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white">Name</Label>
                          <Input
                            required
                            value={formData.customerName}
                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Email</Label>
                          <Input
                            type="email"
                            required
                            value={formData.customerEmail}
                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Phone</Label>
                          <Input
                            type="tel"
                            required
                            value={formData.customerPhone}
                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Guests</Label>
                          <Input
                            type="number"
                            required
                            value={formData.numberOfPeople}
                            onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Special Requests</Label>
                        <Textarea
                          value={formData.specialRequests}
                          onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                          className="bg-white/10 border-white/20 text-white min-h-[80px]"
                        />
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={() => setCurrentStep(1)} className="text-gray-400">
                          Cancel
                        </Button>
                        <Button
                          onClick={() =>
                            formData.customerName && formData.customerEmail && formData.customerPhone
                              ? setCurrentStep(3)
                              : toast({ variant: 'destructive', title: 'Missing fields' })
                          }
                          className="bg-purple-600 text-white px-8"
                        >
                          Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-300">
                          <span>Date: {formData.bookingDate}</span>
                          <span className="text-right">Time: {formData.startTime}</span>
                          <span>Lanes: {formData.laneCount}</span>
                          <span className="text-right">Price: €{calculateTotal()}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-white">Method</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            onClick={() => setPaymentMethod('stripe')}
                            className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center ${paymentMethod === 'stripe' ? 'border-purple-500 bg-white/5' : 'border-white/10'
                              }`}
                          >
                            <CreditCard className="w-6 h-6 text-purple-400" />
                            <span>Card</span>
                          </div>
                          <div
                            onClick={() => setPaymentMethod('paypal')}
                            className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center ${paymentMethod === 'paypal' ? 'border-blue-500 bg-white/5' : 'border-white/10'
                              }`}
                          >
                            <Wallet className="w-6 h-6 text-blue-400" />
                            <span>PayPal</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={() => setCurrentStep(2)} className="text-gray-400">
                          Back
                        </Button>
                        <Button
                          onClick={handleBook}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white px-8"
                        >
                          {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Pay & Confirm
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