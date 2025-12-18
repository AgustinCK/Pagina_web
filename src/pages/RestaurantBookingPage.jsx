
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const RestaurantBookingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    numberOfPeople: '2',
    bookingDate: '',
    bookingTime: '',
    specialRequests: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert into Database
      const { data, error } = await supabase
        .from('restaurant_table_bookings')
        .insert([
          {
            customer_name: formData.customerName,
            customer_email: formData.customerEmail,
            customer_phone: formData.customerPhone,
            number_of_people: parseInt(formData.numberOfPeople),
            booking_date: formData.bookingDate,
            booking_time: formData.bookingTime,
            booking_status: 'pending' 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. Send Emails via New Transactional Endpoint
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          type: 'restaurant',
          action: 'request',
          bookingId: data.id,
          data: {
             date: formData.bookingDate,
             time: formData.bookingTime,
             guests: formData.numberOfPeople,
             specialRequests: formData.specialRequests
          }
        }
      });

      setSuccess(true);
      toast({
        title: 'Request Sent!',
        description: 'Check your email for confirmation of receipt.'
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
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
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Request Received</h2>
            <p className="text-gray-300">
              Thank you, {formData.customerName}. We have sent a confirmation email to {formData.customerEmail}.
            </p>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm text-orange-200">
              <p>We will review your request and contact you shortly.</p>
            </div>
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
        <title>Reserve Table - Goldgrube Restaurant</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900">
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
            className="max-w-xl mx-auto"
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white">Table Reservation</CardTitle>
                <CardDescription className="text-gray-300">
                  Request a table at our restaurant. No prepayment required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Date</Label>
                        <Input
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="bg-white/10 border-white/20 text-white"
                            value={formData.bookingDate}
                            onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                          />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Time</Label>
                        <Input
                            type="time"
                            required
                            className="bg-white/10 border-white/20 text-white"
                            value={formData.bookingTime}
                            onChange={(e) => setFormData({ ...formData, bookingTime: e.target.value })}
                          />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Guests</Label>
                      <Input
                          type="number"
                          min="1"
                          max="20"
                          required
                          className="bg-white/10 border-white/20 text-white"
                          value={formData.numberOfPeople}
                          onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Name</Label>
                      <Input
                        required
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="Your Name"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Email</Label>
                      <Input
                        type="email"
                        required
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="email@example.com"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Phone</Label>
                      <Input
                        type="tel"
                        required
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="+1 234 567 890"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      />
                    </div>
                     <div className="space-y-2">
                        <Label className="text-white">Special Requests</Label>
                        <Textarea 
                           className="bg-white/10 border-white/20 text-white min-h-[80px]" 
                           value={formData.specialRequests}
                           onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                        />
                     </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-6 text-lg font-semibold shadow-lg shadow-orange-900/20"
                  >
                    {loading ? <><Loader2 className="animate-spin mr-2"/> Sending...</> : 'Send Booking Request'}
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

export default RestaurantBookingPage;
