import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await connectToDatabase();

    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        firstFollowUpInterval: 5,
        secondFollowUpInterval: 7,
        contactSources: [
          { id: 'cs_1', label: 'LinkedIn', active: true, order: 0 },
          { id: 'cs_2', label: 'Upwork', active: true, order: 1 }
        ],
        niches: [
          { id: 'n_1', label: 'Construction', active: true, order: 0 },
          { id: 'n_2', label: 'Marketing Agency', active: true, order: 1 }
        ],
        followUpSteps: [
          { id: '1', label: 'First Follow-Up', interval: 5 },
          { id: '2', label: 'Second Follow-Up', interval: 7 }
        ]
      });
    } else if (!settings.followUpSteps || settings.followUpSteps.length === 0) {
      // Safely migrate existing legacy intervals into the new dynamic steps list
      settings.followUpSteps = [
        { id: '1', label: 'First Follow-Up', interval: settings.firstFollowUpInterval || 5 },
        { id: '2', label: 'Second Follow-Up', interval: settings.secondFollowUpInterval || 7 }
      ];
      await settings.save();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Failed to fetch/initialize settings", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// Optionally handle bulk updates for settings
export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const existingSettings = await Settings.findOne();
    if (!existingSettings) {
      return NextResponse.json({ success: false, error: 'Settings not found' }, { status: 404 });
    }

    // Update settings fields safely
    if (body.firstFollowUpInterval !== undefined) existingSettings.firstFollowUpInterval = body.firstFollowUpInterval;
    if (body.secondFollowUpInterval !== undefined) existingSettings.secondFollowUpInterval = body.secondFollowUpInterval;
    if (body.contactSources) existingSettings.contactSources = body.contactSources;
    if (body.niches) existingSettings.niches = body.niches;
    if (body.followUpSteps) existingSettings.followUpSteps = body.followUpSteps;

    await existingSettings.save();

    return NextResponse.json({ success: true, data: existingSettings });
  } catch (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
