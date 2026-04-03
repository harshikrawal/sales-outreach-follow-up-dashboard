import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Contact from '@/models/Contact';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query: any = {};
    if (status && status !== 'All Contacts') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(query).sort({ nextFollowUpDate: 1, dateAdded: -1 });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error("Failed to fetch contacts", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Default status logic implies new contact is Approached
    const contact = await Contact.create({
      ...body,
      status: 'Approached',
      dateAdded: new Date(),
      statusChangedDate: new Date(),
      // The nextFollowUpDate should be populated via frontend or backend.
      // We can let the UI pass it or we fetch settings here. Oh, it's safer to fetch settings here.
    });

    // Populate nextFollowUpDate based on settings
    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne();
    if (settings) {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + settings.firstFollowUpInterval);
      contact.nextFollowUpDate = nextFollowUp;
      await contact.save();
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error: any) {
    console.error("Failed to create contact", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create contact' }, { status: 400 });
  }
}
