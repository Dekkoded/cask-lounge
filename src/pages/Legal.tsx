import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type Doc = 'datenschutz' | 'agb' | 'impressum'

const TITLES: Record<Doc, string> = {
  datenschutz: 'Datenschutzerklärung',
  agb: 'Allgemeine Geschäftsbedingungen',
  impressum: 'Impressum',
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-stone-100 mt-6 mb-2">{children}</h2>
}

function P({ children, className = 'text-stone-300' }: { children: React.ReactNode; className?: string }) {
  return <p className={`${className} text-sm leading-relaxed`}>{children}</p>
}

function Impressum() {
  return (
    <div className="flex flex-col gap-1">
      <P>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz):</P>
      <P>Leon Evers</P>
      <P>Untere Str. 18</P>
      <P>51688 Wipperfürth</P>
      <H2>Kontakt</H2>
      <P>E-Mail: info@casklounge.com</P>
      <H2>Verantwortlich für den Inhalt</H2>
      <P>Leon Evers, Untere Str. 18, 51688 Wipperfürth</P>
    </div>
  )
}

function Datenschutz() {
  return (
    <div className="flex flex-col gap-1">
      <H2>1. Verantwortlicher</H2>
      <P>Verantwortlich für die Datenverarbeitung auf dieser Website ist Leon Evers, Untere Str. 18, 51688 Wipperfürth, erreichbar unter info@casklounge.com.</P>

      <H2>2. Welche Daten wir verarbeiten</H2>
      <P>Bei der Registrierung erheben wir deine E-Mail-Adresse, deinen Benutzernamen und ein verschlüsselt gespeichertes Passwort. Inhalte, die du erstellst (Bewertungen, Notizen, Kommentare, Fotos, Gruppen), werden gespeichert, um den Dienst bereitzustellen.</P>

      <H2>3. Zweck und Rechtsgrundlage</H2>
      <P>Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO) sowie auf Basis deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), etwa für Push- und E-Mail-Benachrichtigungen.</P>

      <H2>4. Hosting und Auftragsverarbeiter</H2>
      <P>Die Anwendung wird über Vercel bereitgestellt; Daten werden bei Supabase (Postgres-Datenbank, Authentifizierung, Datei-Speicher) verarbeitet. Mit diesen Anbietern bestehen Verträge zur Auftragsverarbeitung. Beim Aufruf der Anwendung verarbeiten diese Anbieter technisch notwendige Server-Protokolldaten (z. B. IP-Adresse, Zeitpunkt des Zugriffs) zum sicheren und stabilen Betrieb; Rechtsgrundlage hierfür ist unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).</P>

      <H2>5. Speicherdauer</H2>
      <P>Deine Daten werden gespeichert, solange dein Konto besteht. Bei Löschung deines Kontos werden die zugehörigen Daten entfernt.</P>

      <H2>6. Deine Rechte</H2>
      <P>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Dein Konto kannst du jederzeit in den Profileinstellungen löschen. Bei Fragen wende dich an info@casklounge.com.</P>

      <H2>7. Widerruf von Einwilligungen</H2>
      <P>Erteilte Einwilligungen (z. B. für Benachrichtigungen) kannst du jederzeit mit Wirkung für die Zukunft in deinem Profil widerrufen.</P>

      <H2>8. Beschwerderecht</H2>
      <P>Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner personenbezogenen Daten zu beschweren. Für unseren Sitz zuständig ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</P>

      <P className="text-stone-500 mt-6">Stand: Juni 2026</P>
    </div>
  )
}

function AGB() {
  return (
    <div className="flex flex-col gap-1">
      <H2>1. Geltungsbereich</H2>
      <P>Diese Bedingungen gelten für die Nutzung der Anwendung Cask Lounge (im Folgenden „Dienst“).</P>

      <H2>2. Leistungsbeschreibung</H2>
      <P>Der Dienst ermöglicht das Erfassen, Bewerten und Teilen von Whisky-Verkostungen sowie die Organisation in Gruppen. Es besteht kein Anspruch auf ständige Verfügbarkeit.</P>

      <H2>3. Konto und Pflichten der Nutzer</H2>
      <P>Du bist für die Geheimhaltung deiner Zugangsdaten verantwortlich. Inhalte, die du einstellst, dürfen keine Rechte Dritter verletzen und nicht gegen geltendes Recht verstoßen.</P>

      <H2>4. Inhalte</H2>
      <P>Du behältst die Rechte an deinen Inhalten und räumst uns das Recht ein, sie im Rahmen des Dienstes anzuzeigen. Wir dürfen rechtswidrige Inhalte entfernen.</P>

      <H2>5. Verantwortung für Alkohol</H2>
      <P>Der Dienst richtet sich an volljährige Personen. Bitte genieße Alkohol verantwortungsvoll.</P>

      <H2>6. Haftung</H2>
      <P>Wir haften nur für Vorsatz und grobe Fahrlässigkeit sowie im Rahmen zwingender gesetzlicher Vorschriften.</P>

      <H2>7. Kündigung</H2>
      <P>Du kannst dein Konto jederzeit über die Profileinstellungen löschen.</P>

      <H2>8. Schlussbestimmungen</H2>
      <P>Es gilt das Recht der Bundesrepublik Deutschland. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</P>

      <P className="text-stone-500 mt-6">Stand: Juni 2026</P>
    </div>
  )
}

export default function Legal({ doc }: { doc: Doc }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-2xl mx-auto p-6 pb-24">
      <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm">← {t('common.back')}</Link>
      <h1 className="text-2xl font-bold text-stone-100 mt-4 mb-2">{TITLES[doc]}</h1>
      <div className="mt-4">
        {doc === 'impressum' && <Impressum />}
        {doc === 'datenschutz' && <Datenschutz />}
        {doc === 'agb' && <AGB />}
      </div>
    </div>
  )
}
