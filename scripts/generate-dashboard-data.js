const { MongoClient } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quasarleads';

async function generateDashboardData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const leadsCollection = db.collection('leads');
    
    // Generate sample leads with realistic data
    const sampleLeads = [
      {
        name: 'John Smith',
        company: 'Acme Corp',
        email: 'john.smith@acme.com',
        phone: '+1234567890',
        source: 'website',
        status: 'active',
        googleAds: true,
        dealValue: 5000,
        location: 'New York',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-16'), template: 'First Contact' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_once',
        emailSequenceStep: 1
      },
      {
        name: 'Sarah Johnson',
        company: 'TechStart Inc',
        email: 'sarah.johnson@techstart.com',
        phone: '+1234567891',
        source: 'google-ads',
        status: 'emailed',
        googleAds: true,
        dealValue: 8000,
        location: 'San Francisco',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date(),
        followUpCount: 2,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-11'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2024-01-13'), template: 'Follow Up' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_twice',
        emailSequenceStep: 2
      },
      {
        name: 'Mike Wilson',
        company: 'Global Solutions',
        email: 'mike.wilson@globalsolutions.com',
        phone: '+1234567892',
        source: 'linkedin',
        status: 'emailed',
        googleAds: false,
        dealValue: 12000,
        location: 'Chicago',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date(),
        followUpCount: 3,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-06'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2024-01-08'), template: 'Follow Up' },
          { stage: 'called_three_times', sentAt: new Date('2024-01-10'), template: 'Value Proposition' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_three_times',
        emailSequenceStep: 3
      },
      {
        name: 'Emily Davis',
        company: 'Innovation Labs',
        email: 'emily.davis@innovationlabs.com',
        phone: '+1234567893',
        source: 'referral',
        status: 'booked',
        googleAds: false,
        dealValue: 15000,
        location: 'Boston',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        followUpCount: 4,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-02'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2024-01-04'), template: 'Follow Up' },
          { stage: 'called_three_times', sentAt: new Date('2024-01-06'), template: 'Value Proposition' },
          { stage: 'called_four_times', sentAt: new Date('2024-01-08'), template: 'Meeting Request' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: false,
        emailSequenceStage: 'meeting',
        emailSequenceStep: 4
      },
      {
        name: 'David Brown',
        company: 'Enterprise Solutions',
        email: 'david.brown@enterprisesolutions.com',
        phone: '+1234567894',
        source: 'website',
        status: 'closed won',
        googleAds: true,
        dealValue: 25000,
        location: 'Los Angeles',
        createdAt: new Date('2023-12-20'),
        updatedAt: new Date(),
        followUpCount: 5,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2023-12-21'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2023-12-23'), template: 'Follow Up' },
          { stage: 'called_three_times', sentAt: new Date('2023-12-26'), template: 'Value Proposition' },
          { stage: 'called_four_times', sentAt: new Date('2023-12-28'), template: 'Meeting Request' },
          { stage: 'called_five_times', sentAt: new Date('2023-12-30'), template: 'Closing' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: false,
        emailSequenceStage: 'deal',
        emailSequenceStep: 5
      },
      {
        name: 'Lisa Anderson',
        company: 'Digital Marketing Pro',
        email: 'lisa.anderson@digitalmarketingpro.com',
        phone: '+1234567895',
        source: 'google-ads',
        status: 'emailed',
        googleAds: true,
        dealValue: 6000,
        location: 'Miami',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date(),
        followUpCount: 1,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-21'), template: 'First Contact' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_once',
        emailSequenceStep: 1
      },
      {
        name: 'Robert Chen',
        company: 'Startup Ventures',
        email: 'robert.chen@startupventures.com',
        phone: '+1234567896',
        source: 'linkedin',
        status: 'emailed',
        googleAds: false,
        dealValue: 9000,
        location: 'Seattle',
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date(),
        followUpCount: 6,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-19'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2024-01-21'), template: 'Follow Up' },
          { stage: 'called_three_times', sentAt: new Date('2024-01-23'), template: 'Value Proposition' },
          { stage: 'called_four_times', sentAt: new Date('2024-01-25'), template: 'Meeting Request' },
          { stage: 'called_five_times', sentAt: new Date('2024-01-27'), template: 'Closing' },
          { stage: 'called_six_times', sentAt: new Date('2024-01-29'), template: 'Final Follow Up' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_six_times',
        emailSequenceStep: 6
      },
      {
        name: 'Jennifer Martinez',
        company: 'Creative Agency',
        email: 'jennifer.martinez@creativeagency.com',
        phone: '+1234567897',
        source: 'website',
        status: 'emailed',
        googleAds: false,
        dealValue: 7000,
        location: 'Austin',
        createdAt: new Date('2024-01-22'),
        updatedAt: new Date(),
        followUpCount: 7,
        emailHistory: [
          { stage: 'called_once', sentAt: new Date('2024-01-23'), template: 'First Contact' },
          { stage: 'called_twice', sentAt: new Date('2024-01-25'), template: 'Follow Up' },
          { stage: 'called_three_times', sentAt: new Date('2024-01-27'), template: 'Value Proposition' },
          { stage: 'called_four_times', sentAt: new Date('2024-01-29'), template: 'Meeting Request' },
          { stage: 'called_five_times', sentAt: new Date('2024-01-31'), template: 'Closing' },
          { stage: 'called_six_times', sentAt: new Date('2024-02-02'), template: 'Final Follow Up' },
          { stage: 'called_seven_times', sentAt: new Date('2024-02-04'), template: 'Last Attempt' }
        ],
        emailAutomationEnabled: true,
        emailSequenceActive: true,
        emailSequenceStage: 'called_seven_times',
        emailSequenceStep: 7
      }
    ];

    // Clear existing leads
    await leadsCollection.deleteMany({});
    console.log('Cleared existing leads');

    // Insert sample leads
    const result = await leadsCollection.insertMany(sampleLeads);
    console.log(`Inserted ${Object.keys(result.insertedIds).length} sample leads`);

    // Generate additional leads for better distribution
    const additionalLeads = [];
    for (let i = 0; i < 20; i++) {
      const statuses = ['active', 'emailed', 'booked', 'closed won'];
      const sources = ['website', 'google-ads', 'linkedin', 'referral'];
      const locations = ['New York', 'San Francisco', 'Chicago', 'Boston', 'Los Angeles', 'Miami', 'Seattle', 'Austin'];
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const googleAds = source === 'google-ads';
      const followUpCount = status === 'emailed' ? Math.floor(Math.random() * 7) + 1 : 0;
      
      const lead = {
        name: `Lead ${i + 1}`,
        company: `Company ${i + 1}`,
        email: `lead${i + 1}@company${i + 1}.com`,
        phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        source,
        status,
        googleAds,
        dealValue: Math.floor(Math.random() * 20000) + 1000,
        location,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        followUpCount,
        emailAutomationEnabled: status !== 'active',
        emailSequenceActive: status === 'emailed',
        emailSequenceStep: followUpCount,
        emailHistory: []
      };

      // Add email history based on follow-up count
      for (let j = 1; j <= followUpCount; j++) {
        const stages = ['called_once', 'called_twice', 'called_three_times', 'called_four_times', 'called_five_times', 'called_six_times', 'called_seven_times'];
        lead.emailHistory.push({
          stage: stages[j - 1],
          sentAt: new Date(Date.now() - (followUpCount - j) * 2 * 24 * 60 * 60 * 1000),
          template: `Template ${j}`
        });
      }

      additionalLeads.push(lead);
    }

    const additionalResult = await leadsCollection.insertMany(additionalLeads);
    console.log(`Inserted ${Object.keys(additionalResult.insertedIds).length} additional leads`);

    console.log('Dashboard data generation completed successfully!');
    console.log('Total leads created:', Object.keys(result.insertedIds).length + Object.keys(additionalResult.insertedIds).length);

  } catch (error) {
    console.error('Error generating dashboard data:', error);
  } finally {
    await client.close();
  }
}

// Run the script
generateDashboardData(); 