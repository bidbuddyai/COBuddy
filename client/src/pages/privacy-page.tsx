import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Statement</CardTitle>
          <p className="text-muted-foreground">Last updated: January 12, 2025</p>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information (email, name, company)</li>
            <li>Documents you upload (T&M sheets, quotes, invoices, rate tables)</li>
            <li>Project and change order data</li>
            <li>Usage data and analytics</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and maintain our AI-powered document processing services</li>
            <li>Process your documents using OpenAI's GPT-4 Vision API</li>
            <li>Generate change orders and analytics</li>
            <li>Improve our services and develop new features</li>
            <li>Communicate with you about your account</li>
          </ul>

          <h2>3. Data Processing and AI</h2>
          <p>
            When you upload documents, they are processed using OpenAI's GPT-4 Vision API. This means:
          </p>
          <ul>
            <li>Document images are sent to OpenAI for analysis</li>
            <li>OpenAI processes the data according to their privacy policy</li>
            <li>Extracted data is stored in our secure database</li>
            <li>Original documents are stored on secure servers</li>
          </ul>

          <h2>4. Data Storage and Security</h2>
          <p>
            We implement appropriate security measures to protect your information:
          </p>
          <ul>
            <li>Encrypted data transmission (HTTPS)</li>
            <li>Secure cloud storage for documents</li>
            <li>Access controls and authentication</li>
            <li>Regular security updates and monitoring</li>
          </ul>

          <h2>5. Data Sharing</h2>
          <p>
            We do not sell your personal information. We share your information only in these circumstances:
          </p>
          <ul>
            <li>With OpenAI for document processing (as described above)</li>
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety</li>
          </ul>

          <h2>6. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Opt-out of certain communications</li>
          </ul>

          <h2>7. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your data at any time.
          </p>

          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be processed in countries where our service providers operate. We ensure appropriate safeguards are in place for such transfers.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not intended for children under 18. We do not knowingly collect information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this privacy statement from time to time. We will notify you of any material changes.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For questions about this privacy statement or our practices, please contact us through the application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
