import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, MapPin, ArrowRight, Check, UserCircle, Globe, Camera, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ImageCropModal from './ImageCropModal';

const AuthModal = () => {
  const { 
    isAuthModalOpen, 
    closeAuth, 
    authView, 
    initialEmail, 
    login, 
    signup, 
    sendOtp, 
    verifyOtp, 
    user,
    updateProfile,
    uploadProfilePic,
    submitRoleRequest
  } = useContext(AuthContext);

  const COUNTRIES = [
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', digits: 10 },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', digits: 10 },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', digits: 10 }
  ];

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneInput, setPhoneInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropFileType, setCropFileType] = useState('image/png');

  const [roleChoice, setRoleChoice] = useState('skip'); // skip | policyholder | hospital | officer
  const [roleDetails, setRoleDetails] = useState('');

  const [view, setView] = useState(authView); 
  
  const [formData, setFormData] = useState({
    email: initialEmail || (user ? user.email : ''),
    password: '',
    otpToken: '',
    firstName: user ? user.firstName : '',
    lastName: user ? user.lastName : '',
    username: user ? user.username : '',
    phone: user ? user.phone : '',
    address: user ? user.address : '',
    gender: user ? user.gender : 'other',
    termsAccepted: true
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setView(authView);
    if (user) {
      setPreviewUrl(user.profilePic || '');
      // Auto-detect country code from user's phone
      if (user.phone) {
        const matchingCountry = COUNTRIES.find(c => user.phone.startsWith(c.dialCode));
        if (matchingCountry) {
          setSelectedCountry(matchingCountry);
          setPhoneInput(user.phone.slice(matchingCountry.dialCode.length).trim());
        } else {
          setPhoneInput(user.phone);
        }
      }
    } else {
      setPreviewUrl('');
      setPhoneInput('');
    }
    setSelectedFile(null);
    setError('');
    setIsCropOpen(false);
    setCropImageSrc('');
    setRoleChoice('skip');
    setRoleDetails('');
  }, [authView, isAuthModalOpen]);

  useEffect(() => {
    if (initialEmail) {
      setFormData(prev => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        phone: user.phone || '',
        address: user.address || '',
        gender: user.gender || 'other',
        profilePic: user.profilePic || ''
      }));
    }
  }, [user]);

  // Debounced real-time username checker
  useEffect(() => {
    const cleanUsername = formData.username ? formData.username.trim().toLowerCase() : '';
    
    if (!cleanUsername) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    if (cleanUsername.length < 3) {
      setUsernameStatus({ checking: false, available: false, message: 'Minimum 3 characters required.' });
      return;
    }
    if (cleanUsername.length > 30) {
      setUsernameStatus({ checking: false, available: false, message: 'Maximum 30 characters allowed.' });
      return;
    }
    if (/\s/.test(cleanUsername)) {
      setUsernameStatus({ checking: false, available: false, message: 'Spaces are not allowed.' });
      return;
    }
    if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      setUsernameStatus({ checking: false, available: false, message: 'Letters, numbers, underscores, and periods only.' });
      return;
    }

    if (user && user.username && cleanUsername === user.username.toLowerCase()) {
      setUsernameStatus({ checking: false, available: true, message: 'Username is available.' });
      return;
    }

    setUsernameStatus(prev => ({ ...prev, checking: true, message: 'Checking availability...' }));

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.post('http://localhost:5000/auth/check-username', { username: cleanUsername });
        setUsernameStatus({
          checking: false,
          available: res.data.available,
          message: res.data.message
        });
      } catch (err) {
        console.error(err);
        setUsernameStatus({ checking: false, available: false, message: 'Network error checking username.' });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.username, user]);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // numeric characters only
    if (value.length <= selectedCountry.digits) {
      setPhoneInput(value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filetypes = /jpeg|jpg|png|webp/i;
    const extname = filetypes.test(file.name.split('.').pop());
    const mimetype = filetypes.test(file.type);
    if (!mimetype || !extname) {
      setError("Only JPEG, JPG, PNG, and WEBP formats are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be less than 2MB.");
      return;
    }

    const src = URL.createObjectURL(file);
    setCropFileType(file.type || 'image/png');
    setCropImageSrc(src);
    setIsCropOpen(true);
    setError('');
  };

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setIsCropOpen(false);
    setCropImageSrc('');
  };

  const handleCropConfirm = (croppedFile, croppedPreviewUrl) => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setIsCropOpen(false);
    setCropImageSrc('');
    setSelectedFile(croppedFile);
    setPreviewUrl(croppedPreviewUrl);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(formData.email, formData.password);
    setLoading(false);
    if (res.success) closeAuth();
    else setError(res.message);
  };

  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await sendOtp(formData.email);
    setLoading(false);
    if (res.success) setView('signup-otp');
    else setError(res.message);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await verifyOtp(formData.email, formData.otpToken);
    setLoading(false);
    if (res.success) setView('signup-profile');
    else setError(res.message);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (usernameStatus.available === false) {
      setError(usernameStatus.message || "Invalid or taken username.");
      return;
    }
    if (usernameStatus.checking) {
      setError("Please wait while username availability is being checked.");
      return;
    }
    if (phoneInput && phoneInput.length !== selectedCountry.digits) {
      setError(`Phone number must be exactly ${selectedCountry.digits} digits for ${selectedCountry.name}.`);
      return;
    }

    setLoading(true);
    setError('');
    
    let currentProfilePic = formData.profilePic || '';
    
    if (selectedFile) {
      setUploadingImage(true);
      const uploadRes = await uploadProfilePic(selectedFile);
      setUploadingImage(false);
      if (uploadRes.success) {
        currentProfilePic = uploadRes.url;
      } else {
        setError(uploadRes.message || "Failed to upload profile picture.");
        setLoading(false);
        return;
      }
    }
    
    const finalPhone = phoneInput ? `${selectedCountry.dialCode}${phoneInput}` : '';
    
    const payload = {
      ...formData,
      profilePic: currentProfilePic,
      phone: finalPhone
    };

    const res = await signup(payload);
    setLoading(false);
    if (res.success) setView('role-apply');
    else setError(res.message);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (usernameStatus.available === false) {
      setError(usernameStatus.message || "Invalid or taken username.");
      return;
    }
    if (usernameStatus.checking) {
      setError("Please wait while username availability is being checked.");
      return;
    }
    if (phoneInput && phoneInput.length !== selectedCountry.digits) {
      setError(`Phone number must be exactly ${selectedCountry.digits} digits for ${selectedCountry.name}.`);
      return;
    }

    setLoading(true);
    setError('');
    
    let currentProfilePic = formData.profilePic || '';
    
    if (selectedFile) {
      setUploadingImage(true);
      const uploadRes = await uploadProfilePic(selectedFile);
      setUploadingImage(false);
      if (uploadRes.success) {
        currentProfilePic = uploadRes.url;
      } else {
        setError(uploadRes.message || "Failed to upload profile picture.");
        setLoading(false);
        return;
      }
    }
    
    const finalPhone = phoneInput ? `${selectedCountry.dialCode}${phoneInput}` : '';
    
    const payload = {
      ...formData,
      profilePic: currentProfilePic,
      phone: finalPhone
    };

    const res = await updateProfile(payload);
    setLoading(false);
    if (res.success) {
      if (view === 'onboarding') {
        window.history.replaceState({}, document.title, "/");
      }
      if (view === 'onboarding') setView('role-apply');
      else closeAuth();
    }
    else setError(res.message);
  };

  const handleRoleApply = async () => {
    setLoading(true);
    setError('');
    try {
      if (roleChoice !== 'skip') {
        const res = await submitRoleRequest({ requestedRole: roleChoice, details: roleDetails });
        if (!res?.success) {
          setError(res?.message || 'Failed to submit role request.');
          setLoading(false);
          return;
        }
      }
      closeAuth();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit role request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  const getTitle = () => {
    switch(view) {
      case 'login': return 'Security Access';
      case 'profile-edit': return 'Profile Management';
      case 'onboarding': return 'Terminal Onboarding';
      case 'signup-email': return 'System Registration';
      case 'signup-otp': return 'Token Verification';
      case 'signup-profile': return 'Identity Profile';
      case 'role-apply': return 'Role Authority';
      default: return 'Care Zone Portal';
    }
  };

  const getSubtitle = () => {
    switch(view) {
      case 'login': return 'Authenticate your credentials for node access.';
      case 'profile-edit': return 'Update your encrypted personal information.';
      case 'onboarding': return 'Initialize your unique system identifier.';
      case 'role-apply': return 'Choose your portal access level (optional).';
      default: return 'Connect to the automated Care Zone engine.';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        fileType={cropFileType}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="liquid-glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border border-white/10"
      >
        {view !== 'onboarding' && (
          <button 
            onClick={closeAuth}
            className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{getTitle()}</h2>
            <p className="text-white/40 text-sm font-medium">{getSubtitle()}</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}

          <form onSubmit={
            view === 'login' ? handleLogin : 
            view === 'signup-email' ? handleSendOtp :
            view === 'signup-otp' ? handleVerifyOtp :
            (view === 'profile-edit' || view === 'onboarding') ? handleUpdateProfile :
            view === 'role-apply' ? (e) => { e.preventDefault(); handleRoleApply(); } :
            handleSignup
          } className="space-y-4">
            
            {(view === 'login' || view === 'signup-email') && (
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                  />
                </div>
                {view === 'login' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="password"
                      placeholder="Security Password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                    />
                  </div>
                )}
              </div>
            )}

            {view === 'signup-otp' && (
              <div className="relative">
                <Check className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="6-Digit Verification Token"
                  required
                  maxLength={6}
                  value={formData.otpToken}
                  onChange={(e) => setFormData({...formData, otpToken: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg outline-none focus:border-white/30 transition-all tracking-[0.5em] font-black text-center"
                />
              </div>
            )}

            {(view === 'signup-profile' || view === 'profile-edit' || view === 'onboarding') && (
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
                
                {/* High-Fidelity Avatar Upload Zone */}
                <div className="flex flex-col items-center justify-center mb-6 pt-2">
                  <div className="relative group w-24 h-24 rounded-full border-2 border-white/10 p-1 hover:border-white/30 transition-all cursor-pointer overflow-hidden shadow-xl bg-black/40">
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      accept="image/jpeg,image/jpg,image/png,image/webp" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <label htmlFor="avatar-upload" className="w-full h-full rounded-full cursor-pointer flex items-center justify-center overflow-hidden relative">
                      {previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt="Avatar Preview" 
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center text-white/30 text-xs font-black uppercase group-hover:text-white/60 transition-colors">
                          Photo
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-white">
                        <Camera className="w-4 h-4" />
                        <span>Change</span>
                      </div>
                    </label>
                  </div>
                  {uploadingImage && (
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2 animate-pulse">Syncing image payload...</p>
                  )}
                  <p className="text-[9px] text-white/25 font-black uppercase tracking-[0.25em] mt-3">
                    Profile photo optional
                  </p>
                </div>

                {view !== 'onboarding' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        placeholder="First Name"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        placeholder="Last Name"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                )}
                
                {/* Username Input with Live Instagram-style Checker */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      placeholder="System Username"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                      className={`w-full bg-white/5 border rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none transition-all font-medium ${
                        usernameStatus.available === true ? 'border-emerald-500/30 focus:border-emerald-500' :
                        usernameStatus.available === false ? 'border-rose-500/30 focus:border-rose-500' :
                        'border-white/10 focus:border-white/30'
                      }`}
                    />
                  </div>
                  {formData.username && (
                    <div className="px-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                      {usernameStatus.checking ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span className="text-white/40">{usernameStatus.message}</span>
                        </>
                      ) : usernameStatus.available === true ? (
                        <>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-emerald-400">{usernameStatus.message}</span>
                        </>
                      ) : usernameStatus.available === false ? (
                        <>
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                          <span className="text-rose-400">{usernameStatus.message}</span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {view === 'signup-profile' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="password"
                      placeholder="Access Password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                    />
                  </div>
                )}

                {/* Country selector & phone input grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative col-span-1">
                    <select
                      value={selectedCountry.code}
                      onChange={(e) => {
                        const c = COUNTRIES.find(cnt => cnt.code === e.target.value);
                        setSelectedCountry(c);
                        setPhoneInput('');
                      }}
                      className="w-full bg-[#111] border border-white/10 rounded-2xl py-3.5 px-3 text-white text-xs outline-none focus:border-white/30 transition-all font-bold appearance-none text-center cursor-pointer"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#111] text-white py-2">
                          {c.flag} {c.dialCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="relative col-span-2">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="tel"
                      placeholder="Mobile No."
                      value={phoneInput}
                      onChange={handlePhoneChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all font-medium"
                    />
                  </div>
                </div>
                {phoneInput && phoneInput.length !== selectedCountry.digits && (
                  <div className="px-2 text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                    Must be exactly {selectedCountry.digits} digits for {selectedCountry.name} ({phoneInput.length}/{selectedCountry.digits})
                  </div>
                )}

                <div className="relative">
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full bg-[#111] border border-white/10 rounded-2xl py-3.5 px-4 text-[#aaa] text-sm outline-none focus:border-white/30 transition-all font-medium appearance-none"
                  >
                    <option value="other">Gender: Other</option>
                    <option value="male">Gender: Male</option>
                    <option value="female">Gender: Female</option>
                  </select>
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-white/30" />
                  <textarea
                    placeholder="Physical Address for Documentation"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-white/30 transition-all h-24 resize-none font-medium"
                  />
                </div>
              </div>
            )}

            {view === 'role-apply' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                      Optional role application
                    </p>
                  </div>
                  <p className="text-xs text-white/40 font-medium leading-relaxed">
                    You can continue with standard access now, or apply for elevated portals. If approved, your dashboard modules will update automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'skip', title: 'Continue with Standard Access', desc: 'No role application. You can apply later from settings.' },
                    { value: 'policyholder', title: 'Apply: Policyholder', desc: 'Insurance overview and policy-related features.' },
                    { value: 'hospital', title: 'Apply: Hospital', desc: 'Hospital workflow and treatment document tools.' },
                    { value: 'officer', title: 'Apply: Insurance Officer', desc: 'Claim review and adjudication tools.' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoleChoice(opt.value)}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        roleChoice === opt.value
                          ? 'border-white/30 bg-white/5'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]'
                      }`}
                    >
                      <p className="text-xs font-black text-white/85">{opt.title}</p>
                      <p className="text-[11px] text-white/35 font-medium mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {roleChoice !== 'skip' && (
                  <div className="relative">
                    <textarea
                      value={roleDetails}
                      onChange={(e) => setRoleDetails(e.target.value)}
                      placeholder="Optional details (organization, reason, etc.)"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white text-sm outline-none focus:border-white/30 transition-all h-24 resize-none font-medium"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-white/90 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-white/5 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">
                    {view === 'login' ? 'Authenticate' : (view === 'profile-edit' || view === 'onboarding') ? 'Synchronize' : 'Initialize'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {(view === 'login' || view === 'signup-email') && (
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <button
                onClick={handleGoogleAuth}
                className="w-full liquid-glass border border-white/10 text-white/80 py-4 rounded-2xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest group"
              >
                <Globe className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                Continue with Cloud Identity
              </button>
            </div>
          )}

          {view !== 'onboarding' && (
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setError('');
                  setView(view === 'login' ? 'signup-email' : 'login');
                }}
                className="text-white/30 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                {view === 'login' ? "Register New Node" : "Existing Node Login"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
