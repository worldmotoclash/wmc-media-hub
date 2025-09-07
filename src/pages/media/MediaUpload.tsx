import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Upload, ArrowLeft, Sparkles, Link, File, Palette, Clock, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const MediaUpload: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isGenerateMode = location.pathname.includes('/generate');
  
  // Upload form state
  const [uploadData, setUploadData] = useState({
    url: '',
    title: '',
    description: '',
    tags: '',
    keywords: ''
  });
  
  // AI Generation form state
  const [genData, setGenData] = useState({
    provider: '',
    mainPrompt: '',
    negativePrompt: '',
    duration: [5],
    aspectRatio: '16:9',
    creativity: [0.7],
    referenceFile: null as File | null
  });

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the media upload');
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Upload functionality coming soon!');
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genData.provider || !genData.mainPrompt) {
      toast.error('Please select a provider and enter a prompt');
      return;
    }
    toast.info('AI generation functionality coming soon!');
  };

  const pageTitle = isGenerateMode ? 'Generate AI Video' : 'Upload Video';
  const pageDescription = isGenerateMode 
    ? 'Create racing content with AI-powered video generation'
    : 'Add videos from files or URLs to the WMC library';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Hub
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              World Moto Clash Media Hub
            </h1>
            <p className="text-xl text-muted-foreground mb-2">Pure Racing, Pure Entertainment</p>
            <p className="text-muted-foreground">{pageDescription}</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Tabs defaultValue={isGenerateMode ? "generate" : "upload"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger 
                value="upload" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/upload')}
              >
                <Upload className="w-4 h-4" />
                Upload Video
              </TabsTrigger>
              <TabsTrigger 
                value="generate" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/generate')}
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-science-blue" />
                    Upload Video Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="url" className="flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Video URL (YouTube, Vimeo, etc.)
                        </Label>
                        <Input
                          id="url"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={uploadData.url}
                          onChange={(e) => setUploadData({...uploadData, url: e.target.value})}
                          className="mt-2"
                        />
                      </div>

                      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-2">Or drag & drop video files</p>
                        <Button variant="outline" type="button">
                          Browse Files
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Video Title</Label>
                          <Input
                            id="title"
                            placeholder="Racing highlight reel..."
                            value={uploadData.title}
                            onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tags">Tags</Label>
                          <Input
                            id="tags"
                            placeholder="racing, motocross, highlights"
                            value={uploadData.tags}
                            onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the video content..."
                          value={uploadData.description}
                          onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                          className="mt-2"
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input
                          id="keywords"
                          placeholder="motocross racing championship track"
                          value={uploadData.keywords}
                          onChange={(e) => setUploadData({...uploadData, keywords: e.target.value})}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-science-blue hover:bg-science-blue/80">
                      Upload & Process Video
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cinnabar" />
                    AI Video Generation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerateSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="provider">AI Provider</Label>
                      <Select 
                        value={genData.provider} 
                        onValueChange={(value) => setGenData({...genData, provider: value})}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Choose AI provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veo">Google VEO</SelectItem>
                          <SelectItem value="nano-banana">Nano Banana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mainPrompt">Main Prompt</Label>
                      <Textarea
                        id="mainPrompt"
                        placeholder="A high-speed motocross race through muddy terrain with spectacular jumps..."
                        value={genData.mainPrompt}
                        onChange={(e) => setGenData({...genData, mainPrompt: e.target.value})}
                        className="mt-2"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                      <Textarea
                        id="negativePrompt"
                        placeholder="Low quality, blurry, static camera..."
                        value={genData.negativePrompt}
                        onChange={(e) => setGenData({...genData, negativePrompt: e.target.value})}
                        className="mt-2"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration: {genData.duration[0]}s
                        </Label>
                        <Slider
                          value={genData.duration}
                          onValueChange={(value) => setGenData({...genData, duration: value})}
                          max={10}
                          min={3}
                          step={1}
                          className="mt-3"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Aspect Ratio
                        </Label>
                        <Select 
                          value={genData.aspectRatio} 
                          onValueChange={(value) => setGenData({...genData, aspectRatio: value})}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Creativity Level: {Math.round(genData.creativity[0] * 100)}%
                      </Label>
                      <Slider
                        value={genData.creativity}
                        onValueChange={(value) => setGenData({...genData, creativity: value})}
                        max={1}
                        min={0}
                        step={0.1}
                        className="mt-3"
                      />
                    </div>

                    <div>
                      <Label>Reference Image/Video (Optional)</Label>
                      <div className="mt-2 text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <File className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-2">Upload reference material</p>
                        <Button variant="outline" type="button">
                          Choose File
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-cinnabar hover:bg-cinnabar/80">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Video
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default MediaUpload;