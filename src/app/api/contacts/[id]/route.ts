import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Contact from '@/models/Contact';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const contact = await Contact.findById(id);
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: contact });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const contact = await Contact.findById(id);
    if (!contact) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Handle status change
    let oldStatus = contact.status;
    let newStatus = body.status;

    // Apply updates
    Object.assign(contact, body);

    if (newStatus && oldStatus !== newStatus) {
      contact.statusChangedDate = new Date();
      
      const Settings = (await import('@/models/Settings')).default;
      const settings = await Settings.findOne();
      
      if (['Connected', 'Lost', 'Closed Won'].includes(newStatus)) {
        contact.nextFollowUpDate = undefined; // Terminal status
      } else {
        const step = settings?.followUpSteps?.find((s: any) => s.label === newStatus);
        if (step) {
          const d = new Date();
          d.setDate(d.getDate() + (step.interval || 7));
          contact.nextFollowUpDate = d;
        } else if (newStatus === 'First Follow-Up') {
          const d = new Date();
          d.setDate(d.getDate() + (settings?.firstFollowUpInterval || 5));
          contact.nextFollowUpDate = d;
        } else if (newStatus === 'Second Follow-Up') {
          const d = new Date();
          d.setDate(d.getDate() + (settings?.secondFollowUpInterval || 7));
          contact.nextFollowUpDate = d;
        }
      }
    }

    if (body.hasOwnProperty('nextFollowUpDate') && body.nextFollowUpDate === null) {
      contact.nextFollowUpDate = undefined;
    }

    await contact.save();
    return NextResponse.json({ success: true, data: contact });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await Contact.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
