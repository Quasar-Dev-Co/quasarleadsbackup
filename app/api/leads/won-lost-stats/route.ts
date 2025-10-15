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

    // Get all leads with their status and budget information (scoped)
    const leads = await Lead.find({
      ...userFilter,
      $or: [
        { status: 'closed won' },
        { status: 'closed lost' },
        { lossReason: { $exists: true } },
        { closedReason: { $exists: true } }
      ]
    }).lean();

    // Calculate statistics
    const wonLeads = leads.filter(lead => 
      lead.status === 'closed won' || lead.closedReason === 'won'
    );
    
    const lostLeads = leads.filter(lead => 
      lead.status === 'closed lost' || lead.closedReason === 'lost' || lead.lossReason
    );

    // Calculate budget totals
    const wonBudget = wonLeads.reduce((total, lead) => total + (lead.budget || 0), 0);
    const lostBudget = lostLeads.reduce((total, lead) => total + (lead.budget || 0), 0);

    // Group lost leads by reason
    const lostByReason = lostLeads.reduce((acc: any, lead: any) => {
      const reason = lead.lossReason || 'unknown';
      if (!acc[reason]) {
        acc[reason] = {
          count: 0,
          budget: 0
        };
      }
      acc[reason].count += 1;
      acc[reason].budget += lead.budget || 0;
      return acc;
    }, {});

    // Calculate monthly data (last 6 months)
    const now = new Date();
    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthLeads = leads.filter(lead => {
        const closedDate = lead.closedDate ? new Date(lead.closedDate) : lead.updatedAt;
        return closedDate >= month && closedDate < nextMonth;
      });
      
      const monthWon = monthLeads.filter(lead => 
        lead.status === 'closed won' || lead.closedReason === 'won'
      );
      
      const monthLost = monthLeads.filter(lead => 
        lead.status === 'closed lost' || lead.closedReason === 'lost' || lead.lossReason
      );
      
      monthlyData.push({
        month: month.toLocaleString('default', { month: 'short' }),
        won: monthWon.length,
        lost: monthLost.length,
        wonBudget: monthWon.reduce((total, lead) => total + (lead.budget || 0), 0),
        lostBudget: monthLost.reduce((total, lead) => total + (lead.budget || 0), 0)
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalWon: wonLeads.length,
          totalLost: lostLeads.length,
          wonBudget: wonBudget,
          lostBudget: lostBudget,
          totalBudget: wonBudget + lostBudget,
          conversionRate: wonLeads.length + lostLeads.length > 0 
            ? ((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100).toFixed(1)
            : 0
        },
        lostByReason,
        monthlyData
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching won/lost statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch won/lost statistics' },
      { status: 500 }
    );
  }
} 