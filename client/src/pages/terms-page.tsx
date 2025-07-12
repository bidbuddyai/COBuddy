import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-muted-foreground">Last updated: January 12, 2025</p>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using CO Buddy AI ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2>2. Use License</h2>
          <p>
            Permission is granted to use CO Buddy AI for personal and commercial purposes related to construction change order management. This license shall automatically terminate if you violate any of these restrictions.
          </p>

          <h2>3. Service Description</h2>
          <p>
            CO Buddy AI provides AI-powered document processing services for construction industry professionals, including:
          </p>
          <ul>
            <li>Document upload and storage</li>
            <li>AI-powered data extraction from T&M sheets, quotes, and invoices</li>
            <li>Change order generation</li>
            <li>Rate table management</li>
            <li>Project analytics and reporting</li>
          </ul>

          <h2>4. User Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account</li>
            <li>All activities that occur under your account</li>
            <li>Ensuring all uploaded documents comply with applicable laws</li>
            <li>The accuracy of data you provide</li>
          </ul>

          <h2>5. Data Processing</h2>
          <p>
            Our AI processes your documents using OpenAI's GPT-4 Vision API. By uploading documents, you consent to this processing. We recommend removing sensitive personal information before uploading.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            You retain all rights to your uploaded documents and generated change orders. CO Buddy AI claims no ownership over your content.
          </p>

          <h2>7. Limitations</h2>
          <p>
            CO Buddy AI is provided "as is" without warranties. We are not liable for any damages arising from the use of our service. AI-extracted data should be reviewed for accuracy before use in official documents.
          </p>

          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend access to our Service immediately, without prior notice, for any breach of these Terms.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>10. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us through the application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}