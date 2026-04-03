import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Contact from '@/models/Contact';

export async function GET() {
  try {
    await connectToDatabase();

    const totalContacts = await Contact.countDocuments();
    const connectedCount = await Contact.countDocuments({ status: 'Connected' });
    const closedWonCount = await Contact.countDocuments({ status: 'Closed Won' });
    const closedLostCount = await Contact.countDocuments({ status: 'Lost' });

    // Today's Follow-up Queue
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const queue = await Contact.find({
      nextFollowUpDate: { $lte: endOfToday },
      status: { $in: ['Approached', 'First Follow-Up'] }
    }).sort({ nextFollowUpDate: 1 });

    const dueTodayCount = queue.length;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalContacts,
          connectedCount,
          closedWonCount,
          closedLostCount,
          dueTodayCount,
        },
        queue
      }
    });
  } catch (error) {
    console.error("Dashboard API error", error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
