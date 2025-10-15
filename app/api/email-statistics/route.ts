import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/leadSchema';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Scope to current user if provided
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userFilter = userId ? {
      $or: [
        { assignedTo: userId },
        { leadsCreatedBy: userId }
      ]
    } : {};

    // Get all leads with email history for this user
    const leads = await Lead.find({
      ...userFilter,
      emailHistory: { $exists: true, $ne: [] }
    }).select('emailHistory emailSequenceStage company').lean();

    console.log(`📊 Found ${leads.length} leads with email history`);

    // Calculate monthly email statistics
    const monthlyStats = new Map();
    let totalEmailsSent = 0;
    let totalResponses = 0;

    leads.forEach(lead => {
      if (lead.emailHistory && lead.emailHistory.length > 0) {
        lead.emailHistory.forEach((email: any) => {
          const sentDate = new Date(email.sentAt);
          const monthKey = sentDate.toLocaleString('nl-NL', { month: 'short' });
          
          if (!monthlyStats.has(monthKey)) {
            monthlyStats.set(monthKey, { emails: 0, responses: 0 });
          }
          
          const monthData = monthlyStats.get(monthKey);
          monthData.emails++;
          totalEmailsSent++;
          
          // Count responses (assuming response when lead moved to called stages)
          if (email.status === 'sent' && ['called_once', 'called_twice', 'called_three_times', 'meeting', 'deal'].includes(lead.emailSequenceStage)) {
            monthData.responses++;
            totalResponses++;
          }
        });
      }
    });

    // Convert to array format for chart
    const currentDate = new Date();
    const emailStats = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleString('nl-NL', { month: 'short' });
      const monthData = monthlyStats.get(monthKey) || { emails: 0, responses: 0 };
      
      emailStats.push({
        name: monthKey,
        emails: monthData.emails,
        responses: monthData.responses
      });
    }

    // Calculate overall statistics
    const responseRate = totalEmailsSent > 0 ? ((totalResponses / totalEmailsSent) * 100).toFixed(1) : '0';

    console.log(`📈 Email Statistics: ${totalEmailsSent} emails sent, ${totalResponses} responses (${responseRate}% rate)`);

    return NextResponse.json({
      success: true,
      data: {
        emailStats,
        totalEmailsSent,
        totalResponses,
        responseRate: parseFloat(responseRate),
        leadsWithEmails: leads.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching email statistics:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch email statistics',
        data: {
          emailStats: [
            { name: "Jan", emails: 0, responses: 0 },
            { name: "Feb", emails: 0, responses: 0 },
            { name: "Mar", emails: 0, responses: 0 },
            { name: "Apr", emails: 0, responses: 0 },
            { name: "Mei", emails: 0, responses: 0 },
            { name: "Jun", emails: 0, responses: 0 },
          ],
          totalEmailsSent: 0,
          totalResponses: 0,
          responseRate: 0,
          leadsWithEmails: 0
        }
      },
      { status: 500 }
    );
  }
} 