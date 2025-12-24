import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PartyPopper, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EventHallBookingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    numberOfPeople: '',
    eventType: 'Birthday',
    bookingDate: '',
    startTime: '',
    endTime: '',
    specialRequests: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (parseInt(formData.numberOfPeople) > 150) {
        throw new Error('Maximum capacity is 150 people');
      }

      // 1. Insert into Database
      const { data, error } = await supabase
        .from('event_hall_bookings')
        .insert([
          {
            customer_name: formData.customerName,
            customer_email: formData.customerEmail,
            customer_phone: formData.customerPhone,
            number_of_people: parseInt(formData.numberOfPeople),
            booking_date: formData.bookingDate,
            start_time: formData.startTime,
            end_time: formData.endTime,
            special_requests: `Type: ${formData.eventType}. ${formData.specialRequests}`,
            booking_status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. Send Email via Transactional Function
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          type: 'event',
          action: 'request',
          bookingId: data.id,
          data: {
             date: formData.bookingDate,
             time: `${formData.startTime} - ${formData.endTime}`,
             guests: formData.numberOfPeople,
             specialRequests: `Type: ${formData.eventType}. ${formData.specialRequests}`
          }
        }
      });

      setSuccess(true);
      toast({
        title: 'Inquiry Sent',
        description: 'Check your email for confirmation.'
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Something went wrong.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto text-teal-400">
              <PartyPopper className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Inquiry Received</h2>
            <p className="text-gray-300">
              Thanks for your interest, {formData.customerName}! We sent a confirmation email to {formData.customerEmail}.
            </p>
            <Button onClick={() => navigate('/')} className="w-full bg-white/10 hover:bg-white/20">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Event Hall Inquiry - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
        <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <Link to="/">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white">Event Hall Inquiry</CardTitle>
                <CardDescription className="text-gray-300">
                  Tell us about your planned event. We offer personalized packages for up to 150 guests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-teal-400 border-b border-white/10 pb-2">Contact Details</h3>
                      <div className="space-y-2">
                        <Label className="text-white">Full Name *</Label>
                        <Input required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Email *</Label>
                        <Input type="email" required value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Phone *</Label>
                        <Input type="tel" required value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-teal-400 border-b border-white/10 pb-2">Event Details</h3>
                      <div className="space-y-2">
                        <Label className="text-white">Event Type *</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/20 text-white"
                          value={formData.eventType}
                          onChange={e => setFormData({...formData, eventType: e.target.value})}
                        >
                          <option value="Birthday" className="bg-slate-800">Birthday Party</option>
                          <option value="Corporate" className="bg-slate-800">Corporate Event</option>
                          <option value="Wedding" className="bg-slate-800">Wedding Reception</option>
                          <option value="Other" className="bg-slate-800">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Date *</Label>
                        <Input type="date" required min={new Date().toISOString().split('T')[0]} value={formData.bookingDate} onChange={e => setFormData({...formData, bookingDate: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                           <Label className="text-white">Start</Label>
                           <Input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-white">End</Label>
                           <Input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Guests (Max 150) *</Label>
                        <Input type="number" min="10" max="150" required value={formData.numberOfPeople} onChange={e => setFormData({...formData, numberOfPeople: e.target.value})} className="bg-white/10 border-white/20 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Tell us more about your event</Label>
                    <Textarea 
                      value={formData.specialRequests} 
                      onChange={e => setFormData({...formData, specialRequests: e.target.value})} 
                      className="bg-white/10 border-white/20 text-white min-h-[120px]" 
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg py-6"
                  >
                    {loading ? <><Loader2 className="animate-spin mr-2"/> Sending...</> : 'Submit Inquiry'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default EventHallBookingPage;