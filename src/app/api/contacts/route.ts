import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Contact from '@/models/Contact';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    if (startDate || endDate) {
      query.dateAdded = {};
      if (startDate) query.dateAdded.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.dateAdded.$lte = end;
      }
    }

    const contacts = await Contact.find(query).sort({ dateAdded: -1 });

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

    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne();

    if (Array.isArray(body)) {
      const contactsToInsert = body.map((item: any) => {
        const nextFollowUp = new Date();
        if (settings) {
          nextFollowUp.setDate(nextFollowUp.getDate() + settings.firstFollowUpInterval);
        }
        return {
          ...item,
          status: 'Approached',
          dateAdded: new Date(),
          statusChangedDate: new Date(),
          nextFollowUpDate: settings ? nextFollowUp : undefined,
        };
      });

      const inserted = await Contact.insertMany(contactsToInsert);
      return NextResponse.json({ success: true, data: inserted });
    }

    // Default status logic implies new contact is Approached
    const contact = await Contact.create({
      ...body,
      status: 'Approached',
      dateAdded: new Date(),
      statusChangedDate: new Date(),
    });

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
