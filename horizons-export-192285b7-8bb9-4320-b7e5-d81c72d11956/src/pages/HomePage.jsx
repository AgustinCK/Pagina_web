import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BugPlay as Bowling, UtensilsCrossed, PartyPopper, Calendar, Clock, MapPin, Info, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
const HomePage = () => {
  const [localEvents, setLocalEvents] = useState([]);
  useEffect(() => {
    const fetchEvents = async () => {
      const {
        data
      } = await supabase.from('local_events').select('*').gte('event_date', new Date().toISOString()).order('event_date', {
        ascending: true
      }).limit(3);
      if (data) setLocalEvents(data);
    };
    fetchEvents();
  }, []);
  const sections = [{
    id: 'kegelbahn',
    icon: Bowling,
    title: 'Kegelbahn (Bowling)',
    description: '8 professional lanes arranged in pairs. Perfect for competitions or fun with friends.',
    features: ['Real-time Availability', '15-min Blocks', 'Instant Booking', 'Cancel up to 8h before'],
    link: '/bowling',
    color: 'from-purple-600 to-indigo-600',
    delay: 0.1
  }, {
    id: 'restaurant',
    icon: UtensilsCrossed,
    title: 'Restaurant',
    description: 'Enjoy our premium cuisine. Reserve your table online and we will confirm your spot.',
    features: ['A la carte Menu', 'Group Tables', 'Cozy Atmosphere', 'Manual Confirmation'],
    link: '/restaurant',
    color: 'from-orange-600 to-red-600',
    delay: 0.2
  }, {
    id: 'events',
    icon: PartyPopper,
    title: 'Event Hall',
    description: 'Planning a big celebration? Our hall accommodates up to 150 guests.',
    features: ['Up to 150 Guests', 'Custom Catering', 'Stage & Sound', 'Personalized Planning'],
    link: '/events',
    color: 'from-emerald-600 to-teal-600',
    delay: 0.3
  }];
  return <>
      <Helmet>
        <title>Goldgrube - Kegelbahn, Restaurant & Events</title>
        <meta name="description" content="Goldgrube Center: Premier Kegelbahn, Restaurant, and Event Hall venue." />
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Navigation */}
        <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
                GOLDGRUBE
              </h1>
            </Link>
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                Admin
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-purple-900/20 to-transparent blur-3xl -z-10" />
          
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }}>
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Goldgrube</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                Your destination for sports, dining, and celebration. Experience our modern Kegelbahn, exquisite restaurant, and versatile event hall.
              </p>
            </motion.div>

            {/* General Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-20">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Opening Hours</h3>
                  <p className="text-sm text-gray-400">Mon-Son : 17:00 - 22:00</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Location</h3>
                  <p className="text-sm text-gray-400">Wiechertstraße 4, 79114 Freiburg im Breisgau</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                  <Info className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Concept</h3>
                  <p className="text-sm text-gray-400">Sports & Fine Dining</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sections */}
        <div className="container mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold mb-10 text-center">Make a Reservation</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {sections.map(section => <motion.div key={section.id} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: section.delay
          }}>
                <Link to={section.link} className="block h-full">
                  <div className="group h-full bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${section.color}`} />
                    
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-6 shadow-lg`}>
                      <section.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold mb-3">{section.title}</h3>
                    <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                      {section.description}
                    </p>

                    <ul className="space-y-2 mb-8">
                      {section.features.map((feature, idx) => <li key={idx} className="flex items-center text-sm text-gray-300">
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 bg-gradient-to-r ${section.color}`} />
                          {feature}
                        </li>)}
                    </ul>

                    <div className="flex items-center text-sm font-semibold text-white group-hover:gap-2 transition-all">
                      Book Now <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>)}
          </div>
        </div>

        {/* Local Events Section */}
        {localEvents.length > 0 && <div className="container mx-auto px-4 py-20 border-t border-white/5">
            <h2 className="text-3xl font-bold mb-10 flex items-center gap-3">
              <Calendar className="text-purple-500" />
              Upcoming Events at Goldgrube
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localEvents.map(event => <Card key={event.id} className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition-colors">
                  {event.image_url && <div className="h-48 w-full overflow-hidden">
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                    </div>}
                  <CardContent className="p-6">
                    <div className="text-sm text-purple-400 mb-2 font-medium">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-3">{event.description}</p>
                  </CardContent>
                </Card>)}
            </div>
          </div>}

        {/* Footer */}
        <footer className="bg-black/40 border-t border-white/10 mt-20 py-12">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p className="mb-2">Goldgrube Bowling Center & Restaurant</p>
            <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>;
};
export default HomePage;