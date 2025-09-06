import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FolderOpen, PlaySquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const ActionCards: React.FC = () => {
  const actions = [
    {
      title: 'Upload New Video',
      description: 'Add new video content to the WMC library',
      icon: Upload,
      href: '/admin/media/upload',
      color: 'from-cinnabar/20 to-cinnabar/10',
      iconColor: 'text-cinnabar'
    },
    {
      title: 'Browse Media Library',
      description: 'View and manage all WMC media files',
      icon: FolderOpen,
      href: '/admin/media/library',
      color: 'from-science-blue/20 to-science-blue/10',
      iconColor: 'text-science-blue'
    },
    {
      title: 'Manage Playlists',
      description: 'Organize videos into curated playlists',
      icon: PlaySquare,
      href: '/admin/media/playlists',
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
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
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