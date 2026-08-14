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

    const firstStepInterval = settings?.followUpSteps && settings.followUpSteps.length > 0
      ? settings.followUpSteps[0].interval
      : (settings?.firstFollowUpInterval || 5);

    if (Array.isArray(body)) {
      const contactsToInsert = body.map((item: any) => {
        const nextFollowUp = new Date();
        if (settings) {
          nextFollowUp.setDate(nextFollowUp.getDate() + firstStepInterval);
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
      nextFollowUp.setDate(nextFollowUp.getDate() + firstStepInterval);
      contact.nextFollowUpDate = nextFollowUp;
      await contact.save();
    }

    return NextResponse.json({ success: true, data: contact });
  } catch (error: any) {
    console.error("Failed to create contact", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create contact' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 });
    }

    await Contact.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ success: true, deletedCount: ids.length });
  } catch (error: any) {
    console.error("Failed to delete contacts", error);
    return NextResponse.json({ success: false, error: 'Failed to delete contacts' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { ids, action } = body;
    
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: 'Invalid contact IDs' }, { status: 400 });
    }

    if (action === 'mark_sent') {
      const Settings = (await import('@/models/Settings')).default;
      const settings = await Settings.findOne();
      const steps = settings?.followUpSteps || [
        { label: "First Follow-Up", interval: 5 },
        { label: "Second Follow-Up", interval: 7 }
      ];

      const contacts = await Contact.find({ _id: { $in: ids } });
      const promises = contacts.map(async (contact) => {
        let nextStatus = "";
        let interval = 0;

        if (contact.status === "Approached") {
          const firstStep = steps[0];
          nextStatus = firstStep ? firstStep.label : "First Follow-Up";
          interval = firstStep ? firstStep.interval : (settings?.firstFollowUpInterval || 5);
        } else {
          const currentIndex = steps.findIndex((s: any) => s.label === contact.status);
          if (currentIndex !== -1 && currentIndex < steps.length - 1) {
            const nextStep = steps[currentIndex + 1];
            nextStatus = nextStep.label;
            interval = nextStep.interval;
          } else {
            // Sequence complete
            const lastStep = steps[steps.length - 1];
            nextStatus = lastStep ? lastStep.label : "Second Follow-Up";
            interval = 0;
          }
        }

        contact.status = nextStatus;
        contact.statusChangedDate = new Date();
        
        if (interval > 0) {
          const d = new Date();
          d.setDate(d.getDate() + interval);
          contact.nextFollowUpDate = d;
        } else {
          contact.nextFollowUpDate = undefined;
        }

        return contact.save();
      });

      await Promise.all(promises);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to bulk update contacts", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
