const nodemailer = require('nodemailer');

// Create transporter using Gmail with proper configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Verify transporter configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    // Verify email configuration first
    const isConfigValid = await verifyEmailConfig();
    if (!isConfigValid) {
      throw new Error('Email configuration is invalid');
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Dream Arena',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: 'Welcome to Dream Arena - Your Football Journey Begins! ⚽',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              margin: 20px auto;
              border-radius: 15px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #0d2818, #1a4d3a);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .logo {
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .tagline {
              font-size: 16px;
              opacity: 0.9;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .welcome-text {
              font-size: 24px;
              margin-bottom: 20px;
              color: #1a4d3a;
              font-weight: bold;
              text-align: center;
            }
            .intro-text {
              font-size: 16px;
              margin-bottom: 30px;
              text-align: center;
              color: #555;
            }
            .features {
              background: linear-gradient(135deg, #f8fffe, #e8f5f0);
              padding: 25px;
              border-radius: 12px;
              margin: 25px 0;
              border-left: 5px solid #ffd700;
            }
            .features-title {
              color: #1a4d3a;
              margin-bottom: 20px;
              font-size: 20px;
              font-weight: bold;
              text-align: center;
            }
            .feature-item {
              display: flex;
              align-items: center;
              margin: 15px 0;
              padding: 12px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              transition: transform 0.2s ease;
            }
            .feature-item:hover {
              transform: translateX(5px);
            }
            .feature-icon {
              color: #ffd700;
              margin-right: 15px;
              font-weight: bold;
              font-size: 18px;
              min-width: 25px;
            }
            .feature-text {
              font-size: 15px;
              color: #333;
            }
            .cta-section {
              text-align: center;
              margin: 30px 0;
              padding: 25px;
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              border-radius: 12px;
            }
            .cta-button {
              display: inline-block;
              background: #1a4d3a;
              color: white;
              padding: 15px 35px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              font-size: 16px;
              transition: all 0.3s ease;
              box-shadow: 0 5px 15px rgba(26, 77, 58, 0.3);
            }
            .cta-button:hover {
              background: #0d2818;
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(26, 77, 58, 0.4);
            }
            .support-section {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              text-align: center;
            }
            .footer {
              background: #1a4d3a;
              color: white;
              text-align: center;
              padding: 25px;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
              opacity: 0.8;
            }
            .social-links {
              margin: 15px 0;
            }
            .social-links a {
              color: #ffd700;
              text-decoration: none;
              margin: 0 10px;
              font-weight: bold;
            }
            @media (max-width: 600px) {
              .container {
                margin: 10px;
                border-radius: 10px;
              }
              .header, .content {
                padding: 25px 20px;
              }
              .welcome-text {
                font-size: 20px;
              }
              .features {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">⚽ Dream Arena</div>
              <p class="tagline">Football Ground Booking Made Easy</p>
            </div>
            
            <div class="content">
              <h2 class="welcome-text">Welcome to Dream Arena, ${userName}! 🎉</h2>
              
              <p class="intro-text">Thank you for joining our football community! We're excited to have you on board and can't wait to help you find the perfect ground for your next game.</p>
              
              <div class="features">
                <h3 class="features-title">🌟 What you can do with Dream Arena:</h3>
                
                <div class="feature-item">
                  <span class="feature-icon">⚽</span>
                  <span class="feature-text">Book premium football grounds instantly with real-time availability</span>
                </div>
                
                <div class="feature-item">
                  <span class="feature-icon">👥</span>
                  <span class="feature-text">Join or create teams with friends and manage your squad</span>
                </div>
                
                <div class="feature-item">
                  <span class="feature-icon">🏆</span>
                  <span class="feature-text">Participate in exciting leagues and tournaments</span>
                </div>
                
                <div class="feature-item">
                  <span class="feature-icon">📊</span>
                  <span class="feature-text">Track your performance and player statistics</span>
                </div>
                
                <div class="feature-item">
                  <span class="feature-icon">⭐</span>
                  <span class="feature-text">Rate and review grounds to help the community</span>
                </div>
                
                <div class="feature-item">
                  <span class="feature-icon">💬</span>
                  <span class="feature-text">Connect with other football enthusiasts in your area</span>
                </div>
              </div>
              
              <div class="cta-section">
                <h3 style="margin-top: 0; color: #1a4d3a;">Ready to get started?</h3>
                <p style="margin-bottom: 20px; color: #333;">Open the Dream Arena app and explore all the amazing grounds available for booking!</p>
                <a href="#" class="cta-button">Start Booking Now</a>
              </div>
              
              <div class="support-section">
                <h4 style="color: #1a4d3a; margin-top: 0;">Need Help? 🤝</h4>
                <p>Our support team is always ready to assist you. Simply reply to this email or contact us through the app.</p>
                <p><strong>Email:</strong> support@dreamarena.com</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 18px; color: #1a4d3a;"><strong>Welcome to the team!</strong></p>
                <p style="color: #666;"><em>The Dream Arena Team</em></p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Dream Arena - Where Football Dreams Come True</strong></p>
              <div class="social-links">
                <a href="#">Facebook</a> |
                <a href="#">Twitter</a> |
                <a href="#">Instagram</a>
              </div>
              <p>This email was sent to ${userEmail} because you registered for Dream Arena.</p>
              <p>© 2025 Dream Arena. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Also include a plain text version for better compatibility
      text: `
        Welcome to Dream Arena, ${userName}!
        
        Thank you for joining our football community! We're excited to have you on board.
        
        What you can do with Dream Arena:
        • Book premium football grounds instantly
        • Join or create teams with friends
        • Participate in exciting leagues and tournaments
        • Track your performance and statistics
        • Rate and review grounds
        • Connect with other football enthusiasts
        
        Ready to get started? Open the Dream Arena app and start booking!
        
        Need help? Contact us at support@dreamarena.com or +1 (555) 123-4567
        
        Welcome to the team!
        The Dream Arena Team
        
        This email was sent to ${userEmail} because you registered for Dream Arena.
        © 2025 Dream Arena. All rights reserved.
      `
    };

    console.log('Attempting to send welcome email to:', userEmail);
    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    
    // Log specific error details for debugging
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env file');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed. Please check internet connection and Gmail settings');
    } else if (error.code === 'EMESSAGE') {
      console.error('Message rejected. Please check email content and recipient');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

// Send verification email (for future use)
const sendVerificationEmail = async (userEmail, userName, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: {
        name: 'Dream Arena',
        address: process.env.EMAIL_USER
      },
      to: userEmail,
      subject: 'Verify Your Dream Arena Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Hello ${userName},</p>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="background: #1a4d3a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
          <p>If you didn't create an account with Dream Arena, please ignore this email.</p>
          <p>Best regards,<br>The Dream Arena Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result.messageId);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  verifyEmailConfig
};