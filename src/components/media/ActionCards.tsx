import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Sparkles, PlaySquare, Scissors, ListVideo, Layers, BookOpen, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

const ActionCards: React.FC = () => {
  const { isCreator, isViewer } = useUser();

  const allActions = [
    {
      title: 'Upload Media',
      description: 'Add videos, images, or audio from files or URLs to the WMC library',
      icon: Upload,
      href: '/admin/media/upload',
      color: 'from-science-blue/20 to-science-blue/10',
      iconColor: 'text-science-blue',
      creatorVisible: true,
      viewerVisible: false
    },
    {
      title: 'Generate AI Image / Video',
      description: 'Create racing content with AI image and video generation',
      icon: Sparkles,
      href: '/admin/media/generate',
      color: 'from-cinnabar/20 to-cinnabar/10',
      iconColor: 'text-cinnabar',
      creatorVisible: false,
      viewerVisible: false
    },
    {
      title: 'Scene Detection',
      description: 'Automatically detect scenes and cuts in videos',
      icon: Scissors,
      href: '/admin/media/scene-detection',
      color: 'from-purple-500/20 to-purple-500/10',
      iconColor: 'text-purple-500',
      creatorVisible: false,
      viewerVisible: false
    },
    {
      title: 'Manage Playlists',
      description: 'Organize and manage Salesforce video playlists',
      icon: ListVideo,
      href: '/admin/media/playlists',
      color: 'from-emerald-500/20 to-emerald-500/10',
      iconColor: 'text-emerald-500',
      creatorVisible: false,
      viewerVisible: false
    },
    {
      title: 'Asset Library',
      description: 'Browse S3 assets, tags, and media configurations',
      icon: PlaySquare,
      href: '/admin/media/library',
      color: 'from-malibu/20 to-malibu/10',
      iconColor: 'text-malibu',
      creatorVisible: true,
      viewerVisible: true
    },
    {
      title: 'Social Media Image Generation',
      description: 'Generate platform-specific variants from master images',
      icon: Layers,
      href: '/admin/media/social-kit',
      color: 'from-accent/20 to-accent/10',
      iconColor: 'text-accent-foreground',
      creatorVisible: false,
      viewerVisible: false
    },
    {
      title: 'Content Diary',
      description: 'Daily record of media uploads with Salesforce sync',
      icon: BookOpen,
      href: '/mediahub/diary',
      color: 'from-primary/20 to-primary/10',
      iconColor: 'text-primary',
      creatorVisible: false,
      viewerVisible: false
    },
    {
      title: "What's New",
      description: 'Latest features, improvements, and release notes',
      icon: Megaphone,
      href: '/admin/media/releases',
      color: 'from-rose-500/20 to-rose-500/10',
      iconColor: 'text-rose-500',
      creatorVisible: true,
      viewerVisible: true
    }
  ];

  const actions = isViewer()
    ? allActions.filter(a => a.viewerVisible)
    : isCreator()
    ? allActions.filter(a => a.creatorVisible)
    : allActions;

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6"
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
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className={`w-8 h-8 ${action.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
