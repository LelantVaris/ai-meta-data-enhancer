import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Play, Users, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BrandLayout from "@/components/layout/BrandLayout";
import FileUpload from "@/components/FileUpload";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Landing = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Handle file upload and redirect to main app
  const handleFileChange = (file: File | null) => {
    if (file) {
      try {
        // Check if file is a CSV
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
          toast({
            title: "Invalid file format",
            description: "Please upload a CSV file.",
            variant: "destructive",
          });
          return;
        }
        
        // Store the file in sessionStorage to pass it to the main app
        // We'll store the file name and create a URL for the file content
        const fileUrl = URL.createObjectURL(file);
        sessionStorage.setItem('pendingUploadFile', file.name);
        sessionStorage.setItem('pendingUploadFileUrl', fileUrl);
        
        // Redirect to the main app
        toast({
          title: "File uploaded successfully",
          description: "Redirecting to the enhancer...",
        });
        
        // Short delay to allow the toast to be seen
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } catch (error) {
        console.error("Error handling file:", error);
        toast({
          title: "Error uploading file",
          description: "An error occurred while processing your file.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <BrandLayout>
      <div className="bg-neutral-50">
        {/* Hero Section with gradient background from main page */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div 
              className="bg-gradient-to-br from-white to-[#F9F0E6] p-6 md:p-10 lg:p-16 rounded-xl text-center"
              style={{ 
                backgroundImage: 'linear-gradient(to bottom right, #FFFFFF, #F9F0E6)'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-neutral-900">
                Optimize Your Meta Tags with AI
              </h1>
              <p className="text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto mb-8">
                Instantly enhance your SEO performance with AI-powered meta title and description optimization. Upload your CSV and get results in seconds.
              </p>
              
              <div className="max-w-xl mx-auto">
                <FileUpload
                  onFileSelected={handleFileChange}
                  fileInputRef={fileInputRef}
                  accept=".csv"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Video Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See How It Works</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Watch our quick tutorial to see how easy it is to optimize your meta tags.
              </p>
            </div>
            
            <div className="relative aspect-video bg-neutral-100 rounded-xl overflow-hidden mx-auto max-w-3xl">
              {/* Video placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-primary/90 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-primary transition-colors">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-neutral-500">Video Tutorial Placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section with image cards */}
        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Everything you need to optimize your meta tags and improve your SEO performance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-48 bg-neutral-100 relative">
                  {/* Image placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-neutral-400">AI Optimization Image</p>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Optimization</h3>
                  <p className="text-neutral-600">
                    Our AI analyzes your content and suggests optimized meta tags that improve click-through rates.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 2 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-48 bg-neutral-100 relative">
                  {/* Image placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-neutral-400">Character Limit Image</p>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Character Limit Checker</h3>
                  <p className="text-neutral-600">
                    Automatically identifies meta titles and descriptions that exceed Google's character limits.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 3 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-48 bg-neutral-100 relative">
                  {/* Image placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-neutral-400">Bulk Processing Image</p>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Bulk Processing</h3>
                  <p className="text-neutral-600">
                    Process hundreds of meta tags at once with our efficient bulk processing system.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Three simple steps to optimize your meta tags and improve your SEO.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Your CSV</h3>
                <p className="text-neutral-600">
                  Upload your CSV file containing your current meta titles and descriptions.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="text-center">
                <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Enhancement</h3>
                <p className="text-neutral-600">
                  Our AI analyzes and optimizes your meta tags for better SEO performance.
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="text-center">
                <div className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Download Results</h3>
                <p className="text-neutral-600">
                  Download your optimized meta tags as a CSV file ready for implementation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section with 3 columns and 3 rows */}
        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Users</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                See what our users are saying about our meta tag optimization tool.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Sarah Johnson</h4>
                      <p className="text-sm text-neutral-500">SEO Specialist</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "This tool has saved me hours of work. The AI suggestions are spot-on and have helped improve our click-through rates significantly."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 2 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Michael Chen</h4>
                      <p className="text-sm text-neutral-500">E-commerce Manager</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "We had thousands of product pages with suboptimal meta tags. This tool helped us optimize them all in just a few hours. Incredible time-saver!"
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 3 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Emma Rodriguez</h4>
                      <p className="text-sm text-neutral-500">Content Marketer</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "The character limit checker alone is worth it. No more truncated meta descriptions in search results. Our SEO has improved dramatically."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 4 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">David Wilson</h4>
                      <p className="text-sm text-neutral-500">Digital Marketing Director</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "We've tried several meta tag optimization tools, but this one stands out for its accuracy and ease of use. Highly recommended for any SEO team."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 5 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Jennifer Lee</h4>
                      <p className="text-sm text-neutral-500">Marketing Manager</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "The AI suggestions are incredibly relevant and have helped us improve our organic traffic by over 30% in just two months."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 6 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Robert Garcia</h4>
                      <p className="text-sm text-neutral-500">Freelance SEO Consultant</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "I use this tool with all my clients now. It's become an essential part of my SEO toolkit and delivers consistent results."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 7 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Sophia Martinez</h4>
                      <p className="text-sm text-neutral-500">E-commerce Owner</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "As a small business owner, this tool has been a game-changer. I can now optimize all my product pages without hiring an expensive SEO agency."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 8 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Thomas Brown</h4>
                      <p className="text-sm text-neutral-500">Content Director</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "The bulk processing feature is a lifesaver. We optimized over 1,000 pages in a single afternoon. Worth every penny of the subscription."
                  </p>
                </CardContent>
              </Card>
              
              {/* Testimonial 9 */}
              <Card className="border border-neutral-200 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 mr-4">
                      {/* User avatar placeholder */}
                    </div>
                    <div>
                      <h4 className="font-semibold">Olivia Taylor</h4>
                      <p className="text-sm text-neutral-500">Digital Strategist</p>
                    </div>
                  </div>
                  <p className="text-neutral-600 italic">
                    "The interface is intuitive and the results are impressive. Our team has seen a measurable improvement in our search rankings since we started using this tool."
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Find answers to common questions about our meta tag optimization tool.
              </p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left text-lg font-medium">
                  How does the AI optimize meta tags?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  Our AI analyzes your current meta tags and content to identify opportunities for improvement. It considers factors like keyword relevance, character limits, and click-through potential to suggest optimized versions that are more likely to perform well in search results.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left text-lg font-medium">
                  What file format do I need to upload?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  We accept CSV files with columns for your current meta titles and descriptions. The tool will automatically detect these columns, but you can also manually select them if needed.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left text-lg font-medium">
                  How many meta tags can I optimize at once?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  With our free plan, you can optimize up to 10 meta tags per day. Premium subscribers ($4.99/month) get unlimited optimizations and can process up to 500 entries per use.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left text-lg font-medium">
                  Can I edit the AI suggestions?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  Yes, you can manually edit any of the AI-suggested meta tags before downloading your results. This gives you full control over the final output while still benefiting from the AI's initial optimization.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left text-lg font-medium">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600">
                  Yes, we take data security seriously. Your uploaded files and optimized results are processed securely and are not stored on our servers after your session ends. We do not use your data for training our AI models.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section with gradient background */}
        <section className="py-16 bg-gradient-to-br from-white to-[#F9F0E6]">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center p-8 md:p-12 rounded-xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Optimize Your Meta Tags?</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-8">
                Start improving your SEO performance today with our AI-powered meta tag optimization tool.
              </p>
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white font-medium px-8 py-6 h-auto text-lg"
                onClick={() => window.location.href = "/"}
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="mt-4 text-sm text-neutral-500">
                No credit card required for free plan. Upgrade anytime.
              </p>
            </div>
          </div>
        </section>
      </div>
    </BrandLayout>
  );
};

export default Landing; 