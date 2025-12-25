import Link from 'next/link';

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/70 text-lg">
            Last updated: January 2025
          </p>
        </div>

        {/* Content Card */}
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
            <div className="text-white/80 space-y-3">
              <p>
                At MyStudyCosts, we take your privacy seriously. This Privacy Policy explains 
                how we handle information when you use our website and calculator tool.
              </p>
              <p>
                This website is designed to help international students estimate costs for 
                studying in Germany. We are committed to protecting your privacy and being 
                transparent about our data practices.
              </p>
            </div>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Collection</h2>
            <div className="text-white/80 space-y-3">
              <p>
                <strong className="text-white">Local Processing Only:</strong> MyStudyCosts does 
                not collect, store, or transmit any personal data. All calculations are performed 
                locally in your browser.
              </p>
              <p>
                We do not use cookies to track users, and we do not employ any analytics tools 
                that collect personal information. Your selections and inputs remain entirely on 
                your device and are never sent to our servers.
              </p>
            </div>
          </section>

          {/* Third-Party APIs */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
            <div className="text-white/80 space-y-3">
              <p>
                <strong className="text-white">Frankfurter API:</strong> Our currency converter 
                uses the Frankfurter API (https://www.frankfurter.app) to fetch live exchange 
                rates. When you select a currency, your browser makes a direct request to the 
                Frankfurter API to retrieve current exchange rates.
              </p>
              <p>
                This request includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your IP address (standard HTTP request)</li>
                <li>The requested currency pair (EUR to USD, INR, CNY, or GBP)</li>
              </ul>
              <p>
                We do not control the data collection practices of Frankfurter API. Please refer 
                to their privacy policy for more information: 
                <a 
                  href="https://www.frankfurter.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline ml-1"
                >
                  frankfurter.app
                </a>
              </p>
            </div>
          </section>

          {/* Hosting */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Hosting and Infrastructure</h2>
            <div className="text-white/80 space-y-3">
              <p>
                This website is hosted on Vercel (https://vercel.com). When you visit our site, 
                Vercel may collect standard web server logs, including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>IP addresses</li>
                <li>Request timestamps</li>
                <li>Browser type and version</li>
                <li>Pages accessed</li>
              </ul>
              <p>
                These logs are standard server logs and are used for security and performance 
                purposes. We do not actively analyze or use these logs to identify individual 
                users. For more information about Vercel's data practices, please visit: 
                <a 
                  href="https://vercel.com/legal/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline ml-1"
                >
                  Vercel Privacy Policy
                </a>
              </p>
            </div>
          </section>

          {/* User Rights (GDPR/DSGVO) */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights (GDPR/DSGVO)</h2>
            <div className="text-white/80 space-y-3">
              <p>
                As we do not collect or store personal data, most GDPR/DSGVO rights are not 
                applicable to our service. However, we respect your privacy rights:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-white">Right to Information:</strong> You have the 
                  right to be informed about data processing (provided in this Privacy Policy).
                </li>
                <li>
                  <strong className="text-white">Right to Object:</strong> Since we do not 
                  collect personal data, there is nothing to object to. You can simply stop 
                  using the website at any time.
                </li>
                <li>
                  <strong className="text-white">Right to Data Portability:</strong> Not 
                  applicable, as we do not store your data.
                </li>
                <li>
                  <strong className="text-white">Right to Erasure:</strong> Not applicable, 
                  as we do not store your data.
                </li>
              </ul>
              <p>
                If you have any questions about your privacy rights or our data practices, 
                please contact us at: 
                <a 
                  href="mailto:contact@mystudycosts.com"
                  className="text-blue-400 hover:text-blue-300 underline ml-1"
                >
                  contact@mystudycosts.com
                </a>
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cookies and Local Storage</h2>
            <div className="text-white/80 space-y-3">
              <p>
                MyStudyCosts does not use cookies for tracking or analytics purposes. However, 
                we may use browser localStorage to remember your cookie consent preference if 
                you accept our cookie notice.
              </p>
              <p>
                This preference is stored locally on your device and is not transmitted to any 
                server. You can clear this preference at any time by clearing your browser's 
                local storage.
              </p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to This Privacy Policy</h2>
            <div className="text-white/80 space-y-3">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any 
                changes by posting the new Privacy Policy on this page and updating the "Last 
                updated" date.
              </p>
              <p>
                We encourage you to review this Privacy Policy periodically for any changes. 
                Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <div className="text-white/80 space-y-3">
              <p>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <p>
                <strong className="text-white">Email:</strong>{' '}
                <a 
                  href="mailto:contact@mystudycosts.com"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  contact@mystudycosts.com
                </a>
              </p>
              <p>
                <strong className="text-white">Website:</strong>{' '}
                <Link 
                  href={`/${locale}`}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  www.mystudycosts.com
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

