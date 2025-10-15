"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Phone, 
  Mail, 
  Building, 
  User, 
  Star,
  Globe,
  MapPin,
  Plus
} from "lucide-react";
import { toast } from "react-hot-toast";
import { auth } from "@/lib/auth";

// Type definitions
export type PipelineStage = 
  | "new_leads" 
  | "called_once" 
  | "called_twice" 
  | "called_three_times" 
  | "called_four_times"
  | "called_five_times"
  | "called_six_times"
  | "called_seven_times"
  | "meeting" 
  | "deal";

export type LeadSource = 
  | "website" 
  | "linkedin" 
  | "referral" 
  | "cold_email" 
  | "event" 
  | "other";

export interface NewLead {
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  source: LeadSource;
  stage: PipelineStage;
  notes: string;
  website: string;
  location: string;
  dealValue: number;
  tags: string[];
  googleAds: boolean;
  organicRanking?: number;
  authInformation?: {
    company_name?: string;
    company_email?: string;
    owner_name?: string;
    owner_email?: string;
    manager_name?: string;
    manager_email?: string;
    hr_name?: string;
    hr_email?: string;
    executive_name?: string;
    executive_email?: string;
  };
}

interface AddNewLeadProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Pipeline stage options
const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: "new_leads", label: "New Leads" },
  { value: "called_once", label: "Called Once" },
  { value: "called_twice", label: "Called Twice" },
  { value: "called_three_times", label: "Called Three Times" },
  { value: "called_four_times", label: "Called Four Times" },
  { value: "called_five_times", label: "Called Five Times" },
  { value: "called_six_times", label: "Called Six Times" },
  { value: "called_seven_times", label: "Called Seven Times" },
  { value: "meeting", label: "Meeting" },
  { value: "deal", label: "Deal" }
];

// Lead source options
const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "cold_email", label: "Cold Email" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" }
];

const AddNewLead = ({ onClose, onSuccess }: AddNewLeadProps) => {
  const [newLead, setNewLead] = useState<NewLead>({
    name: "",
    company: "",
    position: "",
    email: "",
    phone: "",
    source: "other",
    stage: "new_leads",
    notes: "",
    website: "",
    location: "",
    dealValue: 0,
    tags: [],
    googleAds: false,
    organicRanking: undefined,
    authInformation: {
      company_name: "",
      company_email: "",
      owner_name: "",
      owner_email: "",
      manager_name: "",
      manager_email: "",
      hr_name: "",
      hr_email: "",
      executive_name: "",
      executive_email: ""
    }
  });
  
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewLead(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setNewLead(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setNewLead(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle dropdown changes
  const handleSelectChange = (name: string) => (value: string) => {
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  // Add new tag
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    if (!newLead.tags.includes(newTag.trim())) {
      setNewLead(prev => ({ 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      }));
    }
    setNewTag("");
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setNewLead(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(tag => tag !== tagToRemove) 
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!newLead.name.trim() || !newLead.company.trim() || !newLead.email.trim()) {
      toast.error("Please fill in required fields: Name, Company, and Email");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newLead.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Get current user ID
      const userId = await auth.getCurrentUserId();
      
      if (!userId) {
        toast.error("User authentication required. Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/crm/leads?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLead),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Lead created successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to create lead");
      }
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast.error("Failed to create lead. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Add New Lead</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      value={newLead.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="company"
                      name="company"
                      value={newLead.company}
                      onChange={handleInputChange}
                      placeholder="Enter company name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium">Position</Label>
                  <Input
                    id="position"
                    name="position"
                    value={newLead.position}
                    onChange={handleInputChange}
                    placeholder="e.g. CEO, Marketing Director"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={newLead.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={newLead.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      name="website"
                      value={newLead.website}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-sm font-medium">Source</Label>
                  <Select value={newLead.source} onValueChange={handleSelectChange("source")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stage" className="text-sm font-medium">Pipeline Stage</Label>
                  <Select value={newLead.stage} onValueChange={handleSelectChange("stage")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      name="location"
                      value={newLead.location}
                      onChange={handleInputChange}
                      placeholder="City, Country"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dealValue" className="text-sm font-medium">Deal Value ($)</Label>
                  <Input
                    id="dealValue"
                    name="dealValue"
                    type="number"
                    value={newLead.dealValue}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Google Ads Intelligence */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Google Ads Intelligence</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    id="googleAds"
                    name="googleAds"
                    type="checkbox"
                    checked={newLead.googleAds}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="googleAds" className="text-sm font-medium flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Runs Google Ads
                  </Label>
                </div>
                
                {newLead.googleAds && (
                  <div className="space-y-2">
                    <Label htmlFor="organicRanking" className="text-sm font-medium">Organic Ranking</Label>
                    <Input
                      id="organicRanking"
                      name="organicRanking"
                      type="number"
                      value={newLead.organicRanking || ''}
                      onChange={handleInputChange}
                      placeholder="Enter ranking position (1-100)"
                      min="1"
                      max="100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Author/Company Contacts (optional) */}
            <div className="space-y-3 border rounded-md p-3 bg-muted/20">
              <h3 className="text-sm font-medium">Author & Company Contacts (optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Company Email</Label>
                  <Input name="company_email" value={newLead.authInformation?.company_email || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), company_email: e.target.value } }))} placeholder="info@company.com" />
                </div>
                <div>
                  <Label>Company Name</Label>
                  <Input name="company_name" value={newLead.authInformation?.company_name || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), company_name: e.target.value } }))} placeholder="Company Inc." />
                </div>
                <div>
                  <Label>Owner Name</Label>
                  <Input name="owner_name" value={newLead.authInformation?.owner_name || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), owner_name: e.target.value } }))} />
                </div>
                <div>
                  <Label>Owner Email</Label>
                  <Input name="owner_email" value={newLead.authInformation?.owner_email || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), owner_email: e.target.value } }))} />
                </div>
                <div>
                  <Label>Manager Name</Label>
                  <Input name="manager_name" value={newLead.authInformation?.manager_name || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), manager_name: e.target.value } }))} />
                </div>
                <div>
                  <Label>Manager Email</Label>
                  <Input name="manager_email" value={newLead.authInformation?.manager_email || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), manager_email: e.target.value } }))} />
                </div>
                <div>
                  <Label>HR Name</Label>
                  <Input name="hr_name" value={newLead.authInformation?.hr_name || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), hr_name: e.target.value } }))} />
                </div>
                <div>
                  <Label>HR Email</Label>
                  <Input name="hr_email" value={newLead.authInformation?.hr_email || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), hr_email: e.target.value } }))} />
                </div>
                <div>
                  <Label>Executive Name</Label>
                  <Input name="executive_name" value={newLead.authInformation?.executive_name || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), executive_name: e.target.value } }))} />
                </div>
                <div>
                  <Label>Executive Email</Label>
                  <Input name="executive_email" value={newLead.authInformation?.executive_email || ""} onChange={(e) => setNewLead(prev => ({ ...prev, authInformation: { ...(prev.authInformation||{}), executive_email: e.target.value } }))} />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tags</h3>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {newLead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notes</h3>
              <Textarea
                name="notes"
                value={newLead.notes}
                onChange={handleInputChange}
                placeholder="Add any additional notes about this lead..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-fuchsia-600 hover:bg-fuchsia-500"
              >
                {loading ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddNewLead; 