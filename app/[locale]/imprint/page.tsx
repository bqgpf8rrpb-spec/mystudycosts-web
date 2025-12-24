export default function ImprintPage() {
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Imprint / Legal Notice
          </h1>
        </div>

        {/* Content Card */}
        <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-8 space-y-8">
          {/* Address Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Address</h2>
            <div className="text-white/80 space-y-2">
              <p>MyStudyCosts</p>
              <p>Street Address</p>
              <p>City, Postal Code</p>
              <p>Germany</p>
            </div>
          </section>

          {/* Contact Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
            <div className="text-white/80 space-y-2">
              <p>
                <strong>Email:</strong> contact@mystudycosts.com
              </p>
              <p>
                <strong>Website:</strong> www.mystudycosts.com
              </p>
            </div>
          </section>

          {/* Representative Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Representative</h2>
            <div className="text-white/80 space-y-2">
              <p>Name: [Your Name]</p>
              <p>Title: [Your Title]</p>
            </div>
          </section>

          {/* Disclaimer Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Disclaimer</h2>
            <div className="text-white/70 text-sm space-y-3">
              <p>
                The information on this website is for general informational purposes only. 
                While we strive to keep the information up to date and correct, we make no 
                representations or warranties of any kind, express or implied, about the 
                completeness, accuracy, reliability, suitability, or availability with respect 
                to the website or the information, products, services, or related graphics 
                contained on the website for any purpose.
              </p>
              <p>
                The cost estimates provided by this calculator are approximate and should be 
                used as a reference only. Actual costs may vary based on individual circumstances, 
                location, and other factors. Always verify current exchange rates and cost 
                information from official sources.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
