import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Contact from '@/models/Contact';

export async function GET() {
  try {
    await connectToDatabase();

    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne();

    const totalContacts = await Contact.countDocuments();
    const connectedCount = await Contact.countDocuments({ status: 'Connected' });
    const closedWonCount = await Contact.countDocuments({ status: 'Closed Won' });
    const closedLostCount = await Contact.countDocuments({ status: 'Lost' });

    // Today's Follow-up Queue
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Derive active queue statuses (Approached + all followUpSteps except the last one)
    const activeStatuses = ['Approached'];
    if (settings?.followUpSteps && settings.followUpSteps.length > 0) {
      for (let i = 0; i < settings.followUpSteps.length - 1; i++) {
        activeStatuses.push(settings.followUpSteps[i].label);
      }
    } else {
      activeStatuses.push('First Follow-Up');
    }

    const queue = await Contact.find({
      nextFollowUpDate: { $lte: endOfToday },
      status: { $in: activeStatuses }
    }).sort({ nextFollowUpDate: -1 });

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
        queue,
        settings
      }
    });
  } catch (error) {
    console.error("Dashboard API error", error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
