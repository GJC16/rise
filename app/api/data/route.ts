// app/api/data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { computeDecision, SensorData, Decision } from '@/lib/decisionEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamCode, temperature, humidity, distance, motion } = body;

    if (!teamCode) {
      return NextResponse.json({ error: 'teamCode required' }, { status: 400 });
    }

    // Look up team by teamCode
    const teamsRef = db.collection('teams');
    const snap = await teamsRef.where('teamCode', '==', teamCode).limit(1).get();
    if (snap.empty) {
      return NextResponse.json({ error: 'team not found' }, { status: 404 });
    }

    const teamId = snap.docs[0].id;

    const sensors: SensorData = {
      temperature: Number(temperature),
      humidity: Number(humidity),
      distance: Number(distance),
      motion: !!motion,
    };

    const autoDecision = computeDecision(sensors);

    // Write live sensor data
    await db.doc(`teams/${teamId}/iot/live`).set({
      ...sensors,
      updatedAt: new Date().toISOString(),
    });

    // Check current mode — manual overrides skip the auto decision
    const decisionRef = db.doc(`teams/${teamId}/iot/decision`);
    const decisionSnap = await decisionRef.get();
    const currentMode = decisionSnap.exists ? decisionSnap.data()?.mode : 'auto';

    let finalDecision: Decision & { mode: 'auto' | 'manual' };

    if (currentMode === 'manual' && decisionSnap.exists) {
      // Respect the student's manual values already stored in Firestore
      const data = decisionSnap.data()!;
      finalDecision = {
        servoAngle: data.servoAngle ?? 0,
        bulb1: !!data.bulb1,
        bulb2: !!data.bulb2,
        blink: !!data.blink,
        mode: 'manual',
      };
    } else {
      finalDecision = { ...autoDecision, mode: 'auto' };
      await decisionRef.set({
        ...autoDecision,
        mode: 'auto',
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      teamId,
      decision: finalDecision,
    });

  } catch (err) {
    console.error('/api/data error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}