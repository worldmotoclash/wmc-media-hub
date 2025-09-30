import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Sparkles, PlaySquare, Scissors, ListVideo } from 'lucide-react';
import { Link } from 'react-router-dom';

const ActionCards: React.FC = () => {
  const actions = [
    {
      title: 'Upload Video',
      description: 'Add videos from files or URLs to the WMC library',
      icon: Upload,
      href: '/admin/media/upload',
      color: 'from-science-blue/20 to-science-blue/10',
      iconColor: 'text-science-blue'
    },
    {
      title: 'Generate AI Video',
      description: 'Create racing content with AI video generation',
      icon: Sparkles,
      href: '/admin/media/generate',
      color: 'from-cinnabar/20 to-cinnabar/10',
      iconColor: 'text-cinnabar'
    },
    {
      title: 'Scene Detection',
      description: 'Automatically detect scenes and cuts in videos',
      icon: Scissors,
      href: '/admin/media/scene-detection',
      color: 'from-purple-500/20 to-purple-500/10',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Manage Playlists',
      description: 'Organize and manage Salesforce video playlists',
      icon: ListVideo,
      href: '/admin/media/playlists',
      color: 'from-emerald-500/20 to-emerald-500/10',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Asset Library',
      description: 'Browse S3 assets, tags, and media configurations',
      icon: PlaySquare,
      href: '/admin/media/library',
      color: 'from-malibu/20 to-malibu/10',
      iconColor: 'text-malibu'
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8"
        >
          {actions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <Link to={action.href}>
                <Card className="h-full border-2 hover:border-primary/20 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group">
                  <CardContent className="p-8 text-center">
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className={`w-10 h-10 ${action.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ActionCards;