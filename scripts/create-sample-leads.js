#!/usr/bin/env node

// Script to create sample leads in the database
const API_BASE = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

const sampleLeads = [
  {
    fullName: "John Smith",
    email: "john.smith@acmecorp.com",
    company: "Acme Corporation",
    phone: "+1-555-0123",
    website: "https://acmecorp.com",
    source: "website",
    status: "new_leads",
    googleAds: false,
    notes: "Interested in our enterprise solutions"
  },
  {
    fullName: "Sarah Johnson",
    email: "sarah@techstart.io",
    company: "TechStart Inc",
    phone: "+1-555-0124",
    website: "https://techstart.io",
    source: "referral",
    status: "called_once",
    googleAds: true,
    isHighValue: true,
    notes: "High-value prospect, follow up next week"
  },
  {
    fullName: "Michael Chen",
    email: "m.chen@digitalagency.com",
    company: "Digital Marketing Agency",
    phone: "+1-555-0125",
    website: "https://digitalagency.com",
    source: "linkedin",
    status: "called_twice",
    googleAds: true,
    notes: "Looking for email automation tools"
  },
  {
    fullName: "Emily Rodriguez",
    email: "emily@startupco.com",
    company: "Startup Co",
    phone: "+1-555-0126",
    website: "https://startupco.com",
    source: "cold_email",
    status: "meeting",
    googleAds: false,
    isHighValue: true,
    dealValue: 15000,
    notes: "Meeting scheduled for next Tuesday"
  },
  {
    fullName: "David Wilson",
    email: "david@consulting.biz",
    company: "Wilson Consulting",
    phone: "+1-555-0127",
    website: "https://consulting.biz",
    source: "website",
    status: "deal",
    googleAds: true,
    isHighValue: true,
    dealValue: 25000,
    notes: "Deal closed - implementation starting next month"
  }
];

async function createSampleLeads() {
  console.log('🔄 Creating sample leads...');
  
  try {
    // First check if leads already exist
    const checkResponse = await fetch(`${API_BASE}/api/leads?limit=1`);
    const checkData = await checkResponse.json();
    
    if (checkData.success && checkData.leads && checkData.leads.length > 0) {
      console.log('✅ Leads already exist in database. Skipping sample creation.');
      console.log(`Found ${checkData.total} existing leads.`);
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const lead of sampleLeads) {
      try {
        const response = await fetch(`${API_BASE}/api/crm/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lead)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log(`✅ Created lead: ${lead.fullName} (${lead.company})`);
          successCount++;
        } else {
          console.error(`❌ Failed to create lead ${lead.fullName}:`, result.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error creating lead ${lead.fullName}:`, error.message);
        errorCount++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${successCount} leads`);
    console.log(`❌ Failed to create: ${errorCount} leads`);
    console.log(`📋 Total processed: ${sampleLeads.length} leads`);
    
  } catch (error) {
    console.error('❌ Error in sample lead creation:', error.message);
  }
}

async function main() {
  console.log('🧪 Sample Leads Creation Script');
  console.log('===============================\n');
  
  await createSampleLeads();
  
  console.log('\n✅ Script completed! You can now check the Recent Leads section in your dashboard.');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createSampleLeads }; 