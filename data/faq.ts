/**
 * FAQ content per page for SEO and PAA (People Also Ask)
 * Keys match route segments: nc-checker, calculator, erasmus, degree, program, city
 */

import type { FAQItem } from '@/lib/schema/faq';

export const FAQ_BY_PAGE: Record<string, { de: FAQItem[]; en: FAQItem[] }> = {
  'nc-checker': {
    de: [
      { question: 'Was ist der NC?', answer: 'Der Numerus Clausus (NC) ist der Abiturdurchschnitt des schlechtesten Bewerbers, der im vergangenen Jahr einen Studienplatz erhalten hat. Er variiert jährlich je nach Bewerberlage.' },
      { question: 'Wie wird meine Zulassungschance berechnet?', answer: 'Deine Chance wird anhand deiner Abiturnote im Vergleich zum letzten NC des Studiengangs geschätzt. Liegt deine Note unter dem NC, gilt das Programm als sicher; darüber als Wunsch oder Grenzfach.' },
      { question: 'Was bedeuten sicher, Wunsch und Grenzfach?', answer: 'Sicher: Deine Note ist besser als der letzte NC. Wunsch: Deine Note liegt nah am NC. Grenzfach: Deine Note ist schlechter als der letzte NC, Zulassung unwahrscheinlich aber möglich.' },
    ],
    en: [
      { question: 'What is NC?', answer: 'The Numerus Clausus (NC) is the Abitur grade point average of the worst applicant who received a place in the previous year. It varies annually depending on the number of applicants.' },
      { question: 'How is my admission chance calculated?', answer: 'Your chance is estimated by comparing your Abitur grade to the last NC of the program. If your grade is better than the NC, the program is considered safe; otherwise reach or borderline.' },
      { question: 'What do safe, reach, and unlikely mean?', answer: 'Safe: Your grade is better than the last NC. Reach: Your grade is close to the NC. Unlikely: Your grade is worse than the last NC; admission is improbable but possible.' },
    ],
  },
  calculator: {
    de: [
      { question: 'Was ist ein Sperrkonto?', answer: 'Ein Sperrkonto (Blocked Account) ist ein spezielles Bankkonto für internationale Studierende. Du musst einen festen Betrag einzahlen (z.B. 12.294€ für 2025), von dem du monatlich nur einen Teil abheben darfst.' },
      { question: 'Wie viel Geld brauche ich pro Monat?', answer: 'Je nach Stadt und Lebensstil etwa 900€ bis 1.400€ pro Monat. Das umfasst Miete, Semesterbeitrag, Krankenversicherung, Essen, Lernmittel und Freizeit.' },
      { question: 'Welche Kosten sind enthalten?', answer: 'Der Rechner berücksichtigt Miete, Semesterbeitrag, Krankenversicherung, Essen, Lernmittel, Freizeit sowie einmalige Kosten wie Kaution und Visum.' },
    ],
    en: [
      { question: 'What is a blocked account?', answer: 'A blocked account (Sperrkonto) is a special bank account for international students. You must deposit a fixed amount (e.g. 12,294€ for 2025) and can only withdraw a portion each month.' },
      { question: 'How much do I need per month?', answer: 'Depending on city and lifestyle, approximately 900€ to 1,400€ per month. This includes rent, semester fee, health insurance, food, materials, and leisure.' },
      { question: 'What costs are included?', answer: 'The calculator includes rent, semester fee, health insurance, food, learning materials, leisure, and one-time costs such as deposit and visa.' },
    ],
  },
  erasmus: {
    de: [
      { question: 'Was ist Erasmus+?', answer: 'Erasmus+ ist das EU-Programm für Bildung, Jugend und Sport. Es ermöglicht Studierenden ein Auslandssemester an Partneruniversitäten mit Stipendium und Anrechnung der Leistungen.' },
      { question: 'Wie finde ich Partner für mein Programm?', answer: 'Wähle deine deutsche Hochschule und dein Fach. Die Karte zeigt alle Erasmus-Partneruniversitäten mit Kooperationsvertrag für dein Studienfach.' },
      { question: 'Wann soll ich mich bewerben?', answer: 'Bewerbungen laufen meist ein Jahr im Voraus. Bewirb dich an deiner Heimatuni bis etwa Januar für ein Wintersemester bzw. September für ein Sommersemester im Ausland.' },
    ],
    en: [
      { question: 'What is Erasmus+?', answer: 'Erasmus+ is the EU program for education, youth, and sport. It enables students to study abroad at partner universities with a grant and credit transfer.' },
      { question: 'How do I find partners for my program?', answer: 'Select your German university and subject. The map shows all Erasmus partner universities with cooperation agreements for your field of study.' },
      { question: 'When should I apply?', answer: 'Applications typically open one year in advance. Apply at your home university around January for winter semester or September for summer semester abroad.' },
    ],
  },
  degree: {
    de: [
      { question: 'Wie funktioniert die Studiengangssuche?', answer: 'Gib deine Abiturnote und dein gewünschtes Fach ein. Du siehst passende Programme nach Zulassungschance (sicher, Wunsch, Grenzfach) sortiert.' },
      { question: 'Was zeigt der NC-Checker für Studiengänge?', answer: 'Du siehst den letzten NC, die Anzahl der Erasmus-Partner und die geschätzten monatlichen Kosten pro Programm und Hochschule.' },
    ],
    en: [
      { question: 'How does the degree search work?', answer: 'Enter your Abitur grade and desired subject. You will see matching programs sorted by admission chance (safe, reach, borderline).' },
      { question: 'What does the NC Checker show for programs?', answer: 'You see the last NC, the number of Erasmus partners, and estimated monthly costs per program and university.' },
    ],
  },
  program: {
    de: [
      { question: 'Was bedeutet der NC für dieses Programm?', answer: 'Der angezeigte NC ist der Abiturdurchschnitt des schlechtesten zugelassenen Bewerbers im letzten Jahr. Ein besserer Schnitt erhöht deine Chancen.' },
      { question: 'Wie viele Erasmus-Partner hat dieses Programm?', answer: 'Die Zahl zeigt Partneruniversitäten im Erasmus-Netzwerk dieser Hochschule für dieses Fach. Du kannst dort ein Auslandssemester verbringen.' },
    ],
    en: [
      { question: 'What does the NC mean for this program?', answer: 'The shown NC is the Abitur average of the worst admitted applicant last year. A better grade increases your chances.' },
      { question: 'How many Erasmus partners does this program have?', answer: 'The number shows partner universities in the Erasmus network of this institution for this subject. You can spend a semester abroad there.' },
    ],
  },
  city: {
    de: [
      { question: 'Welche Universitäten gibt es in dieser Stadt?', answer: 'Die Liste zeigt alle Hochschulen mit Studiengängen in dieser Stadt. Klicke auf eine Universität für detaillierte Programme und NC-Werte.' },
      { question: 'Wie hoch ist die durchschnittliche Semestergebühr?', answer: 'Die durchschnittliche Semestergebühr wird aus den Beiträgen der örtlichen Hochschulen berechnet. Sie enthält Verwaltungsbeitrag, Semesterticket und ggf. Studierendenwerksbeitrag.' },
    ],
    en: [
      { question: 'Which universities are in this city?', answer: 'The list shows all institutions with programs in this city. Click on a university for detailed programs and NC values.' },
      { question: 'What is the average semester fee?', answer: 'The average semester fee is calculated from local universities. It includes administration fee, semester ticket, and student services contribution.' },
    ],
  },
};
