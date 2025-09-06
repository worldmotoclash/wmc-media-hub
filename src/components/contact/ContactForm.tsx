import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const ContactForm: React.FC = () => {
  const handleFormSubmit = (e: React.FormEvent) => {
    // We're not preventing default behavior to allow native form submission
    // Just show a toast to give feedback to the user
    toast.success("Message sent successfully. Our team will contact you shortly.");
    console.log("Form submitted to Salesforce");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
    >
      <h3 className="text-2xl font-bold mb-6">Investor Registration</h3>
      
      <form 
        action="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D5e000000HEcP" 
        method="POST"
        onSubmit={handleFormSubmit}
        className="space-y-6"
      >
        <input type="hidden" name="oid" value="00D5e000000HEcP" />
        <input type="hidden" name="retURL" value="http://worldmotoclash.com/thankyou" />
        
        {/* This meta tag needs to be in the form */}
        <meta httpEquiv="Content-type" content="text/html; charset=UTF-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="first_name" className="text-sm font-medium text-gray-700">First Name</label>
            <Input id="first_name" name="first_name" maxLength={40} placeholder="John" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="last_name" className="text-sm font-medium text-gray-700">Last Name</label>
            <Input id="last_name" name="last_name" maxLength={80} placeholder="Doe" required />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
          <Input id="email" name="email" type="email" maxLength={80} placeholder="john@example.com" required />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="mobile" className="text-sm font-medium text-gray-700">Mobile</label>
          <Input 
            id="mobile" 
            name="mobile" 
            placeholder="+1 (123) 456-7890" 
            maxLength={40} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium text-gray-700">Company (Optional)</label>
          <Input id="company" name="company" placeholder="Your Company" maxLength={40} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-gray-700">City</label>
            <Input id="city" name="city" placeholder="City" maxLength={40} />
          </div>
          <div className="space-y-2">
            <label htmlFor="state" className="text-sm font-medium text-gray-700">State</label>
            <Input id="state" name="state" placeholder="State" maxLength={20} />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="lead_source" className="text-sm font-medium text-gray-700">How Did You Hear About Us</label>
          <select 
            id="lead_source" 
            name="lead_source" 
            className="w-full rounded-md border border-gray-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">--None--</option>
            <option value="Advertisement">Advertisement</option>
            <option value="Employee Referral">Employee Referral</option>
            <option value="External Referral">External Referral</option>
            <option value="In-Store">In-Store</option>
            <option value="On Site">On Site</option>
            <option value="Other">Other</option>
            <option value="Social">Social</option>
            <option value="Trade Show">Trade Show</option>
            <option value="Web">Web</option>
            <option value="Word of mouth">Word of mouth</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="00N5e00000gt2r6" className="text-sm font-medium text-gray-700">Investor Type</label>
          <select 
            id="00N5e00000gt2r6" 
            name="00N5e00000gt2r6" 
            title="Investor Type"
            className="w-full rounded-md border border-gray-200 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            required
          >
            <option value="">--None--</option>
            <option value="Individual Investor">Individual Investor</option>
            <option value="Institutional Investor">Institutional Investor</option>
            <option value="Venture Capital">Venture Capital</option>
            <option value="Private Equity">Private Equity</option>
            <option value="Family Trust">Family Trust</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
          <Textarea 
            id="message" 
            name="description" 
            placeholder="Please provide details about your investment interests..." 
            className="min-h-[120px]" 
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-science-blue hover:bg-science-blue/80 text-white px-4 py-2 rounded transition-colors"
        >
          Submit
        </button>
      </form>
    </motion.div>
  );
};

export default ContactForm;
