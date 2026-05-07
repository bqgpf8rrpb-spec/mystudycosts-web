'use client';

import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { ExportPayload } from '@/lib/export-utils';

interface StudyReportPDFProps {
  payload: ExportPayload;
}

const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#0b1220',
  accent: '#60a5fa',
  lightBlueCard: '#dbeafe',
  lightBlueBorder: '#93c5fd',
  lightBlueText: '#0f172a',
  text: '#f8fafc',
  muted: '#cbd5e1',
  border: '#334155',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bg,
    color: colors.text,
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  headerWrap: {
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  brandAccent: {
    color: colors.accent,
  },
  subline: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 9,
  },
  card: {
    backgroundColor: colors.card,
    border: `1 solid ${colors.border}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
    borderBottom: `1 solid ${colors.border}`,
  },
  label: {
    color: colors.muted,
    maxWidth: '62%',
  },
  value: {
    color: colors.text,
    textAlign: 'right',
    maxWidth: '38%',
  },
  totalBox: {
    marginTop: 8,
    backgroundColor: colors.cardAlt,
    border: `1 solid ${colors.accent}`,
    borderRadius: 8,
    padding: 10,
  },
  totalHeadline: {
    color: colors.muted,
    marginBottom: 4,
    fontSize: 9,
  },
  totalValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextStepsCard: {
    minHeight: 170,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  bullet: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  bulletText: {
    color: colors.text,
    flex: 1,
  },
  note: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 8,
  },
  footerDisclaimer: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: `1 solid ${colors.border}`,
    color: colors.muted,
    fontSize: 8,
  },
  financialAdviceCard: {
    backgroundColor: colors.lightBlueCard,
    border: `1 solid ${colors.lightBlueBorder}`,
  },
  financialAdviceTitle: {
    color: colors.lightBlueText,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  financialAdviceText: {
    color: colors.lightBlueText,
    flex: 1,
  },
  financialAdviceBullet: {
    color: colors.lightBlueText,
    fontWeight: 'bold',
  },
  checklistCard: {
    minHeight: 90,
  },
  checklistItem: {
    color: colors.text,
    flex: 1,
  },
});

function DataRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <View>
      {rows.map((row) => (
        <View key={`${row.label}-${row.value}`} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function StudyReportPreview({ payload }: StudyReportPDFProps) {
  const isGerman = payload.summary.locale === 'de';
  const financialAdvice = payload.additionalSections?.find((section) => section.id === 'financial-advice');
  const checklist = payload.additionalSections?.find((section) => section.id === 'checklist');

  return (
    <div className="mx-auto w-full max-w-4xl rounded-xl border border-blue-300/20 bg-slate-950 p-6 text-slate-50">
      <div className="mb-4 border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold">
          MyStudy<span className="text-blue-400">Costs</span>
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          {payload.summary.title} | {new Date(payload.summary.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">{isGerman ? 'Nutzerprofil' : 'User Profile'}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {payload.details.profile.map((row) => (
            <div key={`profile-${row.label}`} className="flex justify-between gap-4 border-b border-slate-700/70 py-1 text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span className="text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">{isGerman ? 'Kostenübersicht' : 'Cost Breakdown'}</h2>
        <div className="space-y-2">
          {payload.details.costBreakdown.map((row) => (
            <div key={`cost-${row.label}`} className="flex justify-between gap-4 border-b border-slate-700/70 py-1 text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span className="text-right">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-blue-400/60 bg-slate-900 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{isGerman ? 'Gesamtkosten Erstes Jahr' : 'Total First Year'}</p>
          <p className="mt-1 text-2xl font-bold">{payload.summary.firstYearTotal}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">{payload.recommendations.title}</h2>
        <div className="min-h-44 space-y-2">
          {payload.recommendations.items.map((item, index) => (
            <p key={`rec-${index}`} className="text-sm text-slate-100">
              <span className="mr-2 text-blue-400">-</span>
              {item}
            </p>
          ))}
        </div>
        {payload.recommendations.note ? (
          <p className="mt-3 text-xs text-slate-400">{payload.recommendations.note}</p>
        ) : null}
      </div>

      {financialAdvice ? (
        <div className="mt-4 rounded-lg border border-blue-300 bg-blue-100 p-4 text-slate-900">
          <h2 className="mb-3 text-lg font-semibold">{financialAdvice.title}</h2>
          <div className="space-y-2">
            {financialAdvice.rows.map((row) => (
              <p key={`advice-${row.label}`} className="text-sm">
                <span className="mr-2 font-bold">-</span>
                {row.value}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {checklist ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">{checklist.title}</h2>
          <div className="space-y-2">
            {checklist.rows.map((row) => (
              <p key={`check-${row.label}`} className="text-sm text-slate-100">
                <span className="mr-2 text-blue-400">-</span>
                {row.label}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-5 border-t border-slate-700 pt-3 text-xs text-slate-400">
        {isGerman
          ? 'Dieser Bericht dient der Orientierung und ersetzt keine offizielle Finanzberatung.'
          : 'This report is for orientation purposes and does not replace official financial advice.'}
      </p>
    </div>
  );
}

export default function StudyReportPDF({ payload }: StudyReportPDFProps) {
  const isGerman = payload.summary.locale === 'de';
  const financialAdvice = payload.additionalSections?.find((section) => section.id === 'financial-advice');
  const checklist = payload.additionalSections?.find((section) => section.id === 'checklist');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerWrap}>
          <Text style={styles.brandTitle}>
            MyStudy<Text style={styles.brandAccent}>Costs</Text>
          </Text>
          <Text style={styles.subline}>
            {payload.summary.title} | {new Date(payload.summary.generatedAt).toISOString().slice(0, 10)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isGerman ? 'Nutzerprofil' : 'User Profile'}</Text>
          <DataRows rows={payload.details.profile} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isGerman ? 'Kostenübersicht' : 'Cost Breakdown'}</Text>
          <DataRows rows={payload.details.costBreakdown} />
          <View style={styles.totalBox}>
            <Text style={styles.totalHeadline}>{isGerman ? 'Gesamtkosten Erstes Jahr' : 'Total First Year'}</Text>
            <Text style={styles.totalValue}>{payload.summary.firstYearTotal}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.nextStepsCard]}>
          <Text style={styles.sectionTitle}>{payload.recommendations.title}</Text>
          {payload.recommendations.items.map((item, index) => (
            <View key={`step-${index}`} style={styles.bulletRow}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          {payload.recommendations.note ? (
            <Text style={styles.note}>{payload.recommendations.note}</Text>
          ) : null}
        </View>

        {financialAdvice ? (
          <View style={[styles.card, styles.financialAdviceCard]}>
            <Text style={styles.financialAdviceTitle}>{financialAdvice.title}</Text>
            {financialAdvice.rows.map((row) => (
              <View key={`financial-${row.label}`} style={styles.bulletRow}>
                <Text style={styles.financialAdviceBullet}>-</Text>
                <Text style={styles.financialAdviceText}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {checklist ? (
          <View style={[styles.card, styles.checklistCard]}>
            <Text style={styles.sectionTitle}>{checklist.title}</Text>
            {checklist.rows.map((row) => (
              <View key={`checklist-${row.label}`} style={styles.bulletRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.checklistItem}>{row.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footerDisclaimer}>
          {isGerman
            ? 'Dieser Bericht dient der Orientierung und ersetzt keine offizielle Finanzberatung.'
            : 'This report is for orientation purposes and does not replace official financial advice.'}
        </Text>
      </Page>
    </Document>
  );
}
