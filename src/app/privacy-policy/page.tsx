
export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Effective Date: July 8, 2025</p>

      <p className="mb-4">
        Unlazy Writer (“we”, “us”, or “our”) is a product by Haloweave, based in
        Karnataka, India. This Privacy Policy explains how we collect, use, and
        protect your information when you use our website and services at
        UnlazyWriter.com (“Service”).
      </p>

      <h2 className="text-2xl font-semibold mb-4">1. What We Collect</h2>
      <p className="mb-4">
        When you use Unlazy Writer, we may collect the following:
      </p>

      <h3 className="text-xl font-semibold mb-2">Information You Provide</h3>
      <ul className="list-disc list-inside mb-4">
        <li>Email address — collected during account creation</li>
        <li>
          User content — text you write, store, or interact with inside the app
          (notes, drafts, etc.)
        </li>
      </ul>

      <h3 className="text-xl font-semibold mb-2">
        Automatically Collected Information
      </h3>
      <ul className="list-disc list-inside mb-4">
        <li>Device type, browser type, operating system</li>
        <li>IP address and approximate location</li>
        <li>
          Usage data such as interactions, feature clicks, and writing activity
        </li>
      </ul>

      <h3 className="text-xl font-semibold mb-2">Cookies & Tracking</h3>
      <p className="mb-4">
        We use cookies and tracking technologies to:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Keep you signed in</li>
        <li>Analyze usage patterns</li>
        <li>Improve performance and personalize your experience</li>
      </ul>
      <p className="mb-4">
        We use PostHog for product analytics and usage tracking. This service may
        collect anonymized technical data under its own terms and policies.
      </p>

      <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Data</h2>
      <p className="mb-4">
        We use your information to:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Operate and maintain core Unlazy Writer features</li>
        <li>Deliver AI-powered functionality (spell check, research, fact check)</li>
        <li>Respond to support requests</li>
        <li>Analyze trends and improve the product</li>
        <li>Ensure security and prevent abuse</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">3. AI & Third-Party Tools</h2>
      <p className="mb-4">
        Unlazy Writer uses OpenAI and Exa.ai to power AI-assisted features.
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>
          When you interact with AI tools, your input (e.g., highlighted text)
          may be sent to these services.
        </li>
        <li>
          We may retain both input and AI output to improve service functionality.
        </li>
        <li>
          AI responses are not guaranteed to be accurate and may reflect biases.
          Please use judgment.
        </li>
        <li>
          Analytics and feature usage are tracked via PostHog, which helps us
          improve the product experience.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">4. Your Content Belongs to You</h2>
      <ul className="list-disc list-inside mb-4">
        <li>
          You retain full ownership and intellectual property rights over all
          content you write and store within Unlazy Writer.
        </li>
        <li>
          We do not claim any ownership of your notes, drafts, or ideas.
        </li>
        <li>
          We do not publish, sell, or distribute your content unless you
          explicitly authorize it.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">5. Data Storage & Retention</h2>
      <ul className="list-disc list-inside mb-4">
        <li>Your notes and documents are stored securely.</li>
        <li>
          We retain your email and saved content until you delete your account
          or request removal.
        </li>
        <li>
          We store system logs to monitor performance and security.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">6. Data Sharing</h2>
      <ul className="list-disc list-inside mb-4">
        <li>We do not sell or rent your personal data.</li>
        <li>
          We only share limited data with:
          <ul className="list-circle list-inside ml-6">
            <li>Trusted infrastructure providers (e.g., OpenAI, Exa.ai, PostHog)</li>
            <li>Legal authorities if required by law</li>
          </ul>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
      <p className="mb-4">
        You can:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Access or export your stored content</li>
        <li>Request deletion of your data</li>
        <li>Request to close your account</li>
        <li>Revoke analytics tracking via your browser or cookie settings</li>
      </ul>
      <p className="mb-4">
        To make a request, contact us at: unlazywriter@gmail.com
      </p>

      <h2 className="text-2xl font-semibold mb-4">8. Security</h2>
      <p className="mb-4">
        We implement reasonable safeguards (including encryption, role-based
        access, and secure infrastructure) to protect your information.
      </p>
      <p className="mb-4">
        However, no system is completely secure. You use the service at your own
        risk.
      </p>

      <h2 className="text-2xl font-semibold mb-4">9. Children’s Privacy</h2>
      <p className="mb-4">
        Unlazy Writer is not intended for children under the age of 13. We do not
        knowingly collect data from minors.
      </p>

      <h2 className="text-2xl font-semibold mb-4">10. Policy Changes</h2>
      <p className="mb-4">
        We may update this Privacy Policy periodically. Any major changes will be
        communicated via email or in-app notice.
      </p>

      <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
      <p className="mb-1">
        Haloweave
      </p>
      <p className="mb-1">
        2, Oil Mill Rd, Ramaswamipalya
      </p>
      <p className="mb-1">
        Lingarajapuram, Bengaluru
      </p>
      <p className="mb-1">
        Karnataka 560047, India
      </p>
      <p className="mb-4">
        Email: unlazywriter@gmail.com
      </p>
    </div>
  );
}
