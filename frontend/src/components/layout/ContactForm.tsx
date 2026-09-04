'use client';

import { FormEvent, useState } from 'react';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput, TextareaField } from '@/components/ui/FormField';
import Button from '@/components/ui/Button';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/contact/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || 'Could not send your message.');
      }
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-3">Thank you</h2>
        <p className="text-lg mb-6">Your message has been received. We will get back to you soon.</p>
        <Button helpKey="contact.submit_another" type="button" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AlertBanner>{error}</AlertBanner>}
      <TextInput label="Name" id="contact-name" value={name} onChange={(event) => setName(event.target.value)} required />
      <TextInput label="Email" id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <TextareaField label="Message" id="contact-message" className="" value={message} onChange={(event) => setMessage(event.target.value)} required />
      <Button helpKey="contact.submit" type="submit" disabled={submitting}>
        {submitting ? 'Sending...' : 'Send message'}
      </Button>
    </form>
  );
}
