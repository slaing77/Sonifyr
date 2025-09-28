// SendGrid email service integration - blueprint: javascript_sendgrid
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Cosmic-themed welcome email template
export function createWelcomeEmail(
  email: string, 
  playlistData: any, 
  newsletterPreference: 'newsletter' | 'playlist-only'
): EmailParams {
  const cosmicGreeting = newsletterPreference === 'newsletter' 
    ? "Welcome to the cosmic collective! 🌙✨" 
    : "Your cosmic playlist has arrived! 🎵🌟";

  const newsletterSection = newsletterPreference === 'newsletter' 
    ? `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
      <h3 style="margin: 0; color: white;">🌙 You're now part of our cosmic community!</h3>
      <p style="margin: 10px 0;">Monthly astro reports, planetary insights, and exclusive content await you.</p>
    </div>
    `
    : `
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
      <p style="margin: 0; color: #4b5563;">Want more cosmic insights? <a href="#" style="color: #6366f1;">Join our newsletter</a> for monthly astro reports and planetary secrets!</p>
    </div>
    `;

  const subject = newsletterPreference === 'newsletter' 
    ? `🌟 Welcome to Sonifyr + Your Cosmic Playlist "${playlistData.name}"`
    : `🎵 Your Cosmic Playlist "${playlistData.name}" is Ready!`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎵 Sonifyr 🎵</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Turn Planetary Data into Sound</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px;">
          <h2 style="color: #4f46e5; margin-top: 0;">${cosmicGreeting}</h2>
          
          <p>The stars have aligned to bring you a personalized musical journey based on your cosmic birth data. Your playlist <strong>"${playlistData.name}"</strong> contains ${playlistData.songs?.length || 7} carefully selected tracks that resonate with your planetary frequencies.</p>
          
          <!-- Playlist Info -->
          <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <h3 style="margin: 0 0 10px; color: #4f46e5;">🎶 Your Cosmic Playlist</h3>
            <p style="margin: 0 0 10px; font-weight: bold;">${playlistData.name}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${playlistData.description || 'A week of cosmic rhythm and resonance, where planetary movements guide your inner dance.'}</p>
          </div>
          
          ${newsletterSection}
          
          <!-- What is Sonification -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #d97706;">🌟 The Ancient Mystery of Sonification</h3>
            <p style="margin: 0; color: #92400e;">For millennia, humans have believed in the "Music of the Spheres" - the idea that celestial bodies create harmonious sounds as they move through space. Sonifyr transforms this ancient wisdom into modern reality, converting actual planetary orbital frequencies into musical recommendations that align with your cosmic blueprint.</p>
          </div>
          
          <!-- What Secrets Could Be Unlocked -->
          <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #7c3aed;">🔮 What Other Cosmic Secrets Await?</h3>
            <ul style="margin: 10px 0; color: #6b46c1; padding-left: 20px;">
              <li>Daily planetary transit alerts synchronized with your biorhythms</li>
              <li>Harmonic healing frequencies based on your natal chart</li>
              <li>Moon phase playlists that enhance your natural energy cycles</li>
              <li>Retrograde survival soundtracks tailored to your vulnerabilities</li>
              <li>Solar return birthday playlists predicting your year ahead</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <strong>Ready to unlock the full cosmic experience?</strong><br>
            <span style="color: #6b7280;">Join our waiting list for premium features and be the first to access advanced astrological sonification.</span>
          </p>
          
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            ✨ May the frequencies be with you ✨<br>
            The Sonifyr Team
          </p>
          <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
            This cosmic playlist was generated based on your birth data and current planetary positions.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  return {
    to: email,
    from: 'cosmic@sonifyr.app', // You'll need to verify this domain with SendGrid
    subject,
    html,
    text: `${cosmicGreeting}\n\nYour cosmic playlist "${playlistData.name}" is ready! This personalized musical journey was created based on your planetary frequencies and birth data.\n\nSonification transforms the ancient "Music of the Spheres" into modern reality, converting planetary orbital frequencies into musical recommendations.\n\nReady for more cosmic secrets? Join our waiting list for premium features!\n\n✨ May the frequencies be with you ✨\nThe Sonifyr Team`
  };
}