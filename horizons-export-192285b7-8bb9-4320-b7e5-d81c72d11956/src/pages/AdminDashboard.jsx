import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BugPlay as Bowling, UtensilsCrossed, PartyPopper, Calendar, Mail, Phone, Users, Clock, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [bowlingBookings, setBowlingBookings] = useState([]);
  const [restaurantBookings, setRestaurantBookings] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [localEvents, setLocalEvents] = useState([]);

  // Form State for new Event
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', image_url: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [bowling, restaurant, events, localEv] = await Promise.all([
        supabase.from('bowling_lane_bookings').select('*').order('booking_date', { ascending: true }),
        supabase.from('restaurant_table_bookings').select('*').order('booking_date', { ascending: true }),
        supabase.from('event_hall_bookings').select('*').order('booking_date', { ascending: true }),
        supabase.from('local_events').select('*').order('event_date', { ascending: true })
      ]);

      setBowlingBookings(bowling.data || []);
      setRestaurantBookings(restaurant.data || []);
      setEventBookings(events.data || []);
      setLocalEvents(localEv.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load dashboard data' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (table, id, status) => {
    try {
      const { error } = await supabase.from(table).update({ booking_status: status }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Status Updated', description: `Booking marked as ${status}.` });
      fetchAllData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
    }
  };

  const createLocalEvent = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('local_events').insert([newEvent]);
      if (error) throw error;
      toast({ title: 'Event Created', description: 'New local event added successfully.' });
      setNewEvent({ title: '', description: '', event_date: '', image_url: '' });
      fetchAllData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create event' });
    }
  };

  const deleteLocalEvent = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const { error } = await supabase.from('local_events').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Event Deleted' });
      fetchAllData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete event' });
    }
  };

  const BookingCard = ({ booking, type, table }) => (
    <Card className="bg-white/5 border-white/10 overflow-hidden mb-4">
      <div className={`h-1 w-full bg-gradient-to-r ${
        type === 'bowling' ? 'from-purple-500 to-indigo-500' : 
        type === 'restaurant' ? 'from-orange-500 to-red-500' : 
        'from-teal-500 to-green-500'
      }`} />
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-white text-lg">{booking.customer_name}</h3>
          <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${
            booking.booking_status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
            booking.booking_status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {booking.booking_status}
          </span>
        </div>
        
        <div className="space-y-1 text-sm text-gray-300 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" /> {booking.booking_date}
            <Clock className="w-3 h-3 ml-2" /> {booking.start_time || booking.booking_time} 
            {booking.end_time && ` - ${booking.end_time}`}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3" /> {booking.number_of_people} People
            {type === 'bowling' && <span className="ml-2">• Lane {booking.lane_number}</span>}
          </div>
          <div className="flex items-center gap-2">
             <Mail className="w-3 h-3" /> {booking.customer_email}
          </div>
          {booking.special_requests && (
            <div className="bg-white/5 p-2 rounded mt-2 text-xs italic">
              "{booking.special_requests}"
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          {booking.booking_status === 'pending' && (
            <Button size="sm" onClick={() => updateStatus(table, booking.id, 'confirmed')} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" /> Approve
            </Button>
          )}
          {booking.booking_status !== 'cancelled' && (
            <Button size="sm" variant="destructive" onClick={() => updateStatus(table, booking.id, 'cancelled')} className="h-8 text-xs">
              <XCircle className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Goldgrube</title>
      </Helmet>

      <div className="min-h-screen bg-slate-900 text-white">
        <nav className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/">
              <Button variant="ghost" className="text-gray-400 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events_mgmt">Manage Events</TabsTrigger>
              <TabsTrigger value="bowling">Kegelbahn</TabsTrigger>
              <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
              <TabsTrigger value="hall">Event Hall</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-purple-900/20 border-purple-500/30">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-purple-400">{bowlingBookings.filter(b => b.booking_status === 'confirmed').length}</div>
                    <div className="text-sm text-gray-400">Active Lane Bookings</div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-900/20 border-orange-500/30">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-orange-400">{restaurantBookings.filter(b => b.booking_status === 'pending').length}</div>
                    <div className="text-sm text-gray-400">Pending Tables</div>
                  </CardContent>
                </Card>
                <Card className="bg-teal-900/20 border-teal-500/30">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold text-teal-400">{eventBookings.filter(b => b.booking_status === 'pending').length}</div>
                    <div className="text-sm text-gray-400">Hall Inquiries</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="events_mgmt">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Create Event Form */}
                <Card className="bg-white/5 border-white/10">
                  <div className="p-4 border-b border-white/10 font-bold">Create New Event</div>
                  <CardContent className="p-4">
                    <form onSubmit={createLocalEvent} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Title</Label>
                        <Input required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="bg-white/10 border-white/20" />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" required value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} className="bg-white/10 border-white/20" />
                      </div>
                      <div className="space-y-2">
                        <Label>Image URL (Optional)</Label>
                        <Input value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})} className="bg-white/10 border-white/20" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="bg-white/10 border-white/20" />
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Add Event
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Event List */}
                <div className="space-y-4">
                  {localEvents.map(ev => (
                    <div key={ev.id} className="bg-white/5 border border-white/10 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{ev.title}</div>
                        <div className="text-sm text-gray-400">{new Date(ev.event_date).toLocaleDateString()}</div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => deleteLocalEvent(ev.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {localEvents.length === 0 && <p className="text-gray-500 text-center py-4">No events created.</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bowling">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bowlingBookings.map(b => (
                  <BookingCard key={b.id} booking={b} type="bowling" table="bowling_lane_bookings" />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="restaurant">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurantBookings.map(b => (
                  <BookingCard key={b.id} booking={b} type="restaurant" table="restaurant_table_bookings" />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hall">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventBookings.map(b => (
                  <BookingCard key={b.id} booking={b} type="hall" table="event_hall_bookings" />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;