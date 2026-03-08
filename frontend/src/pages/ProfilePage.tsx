import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import './ProfilePage.css';

interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export default function ProfilePage() {
  const [userId] = useState(() => localStorage.getItem('userId'));
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  
  // Form States
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [experience, setExperience] = useState<Experience[]>([]);
  
  // Experience Form
  const [expForm, setExpForm] = useState<Experience>({
    id: '', title: '', company: '', startDate: '', endDate: '', description: ''
  });
  const [showExpForm, setShowExpForm] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile(userId);
    }
  }, [userId]);

  const loadProfile = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getUser(id);
      setUserData(data);
      setFullname(data.fullname || '');
      setPhone(data.phone || '');
      setSkills(data.skills || []);
      setExperience(data.experience || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      const updatedUser = await api.updateProfile(userId, {
        fullname,
        phone,
        skills,
        experience
      });
      setUserData(updatedUser.user);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      if (!skills.includes(newSkill.trim())) {
        setSkills([...skills, newSkill.trim()]);
      }
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const saveExperience = () => {
    const newExp = { ...expForm, id: expForm.id || Date.now().toString() };
    const newExperienceList = expForm.id 
      ? experience.map(e => e.id === expForm.id ? newExp : e)
      : [...experience, newExp];
    
    setExperience(newExperienceList);
    setShowExpForm(false);
    setExpForm({ id: '', title: '', company: '', startDate: '', endDate: '', description: '' });
  };

  const editExperience = (exp: Experience) => {
    setExpForm(exp);
    setShowExpForm(true);
  };
  
  const deleteExperience = (id: string) => {
    setExperience(experience.filter(e => e.id !== id));
  };

  if (loading) return <div>Loading...</div>;
  if (!userId) return <div>Please log in</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Complete your profile to get better job matches</p>
      </div>

      <div className="completeness-bar-container">
        <div 
          className="completeness-bar" 
          style={{ width: `${userData?.profileCompleteness || 0}%` }}
        ></div>
      </div>
      <p style={{textAlign: 'right'}}>{userData?.profileCompleteness || 0}% Completed</p>

      <div className="profile-section">
        <h2 className="section-title">Personal Details</h2>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input 
            className="form-input" 
            value={fullname} 
            onChange={e => setFullname(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" value={userData?.email} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input 
            className="form-input" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
          />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="section-title">Skills</h2>
        <div className="tag-input-container">
          {skills.map(skill => (
            <span key={skill} className="skill-tag">
              {skill}
              <span className="remove-skill" onClick={() => removeSkill(skill)}>×</span>
            </span>
          ))}
          <input 
            className="form-input" 
            style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px' }}
            placeholder="Type a skill and press Enter"
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={addSkill}
          />
        </div>
      </div>

      <div className="profile-section">
        <h2 className="section-title">Experience</h2>
        {experience.map(exp => (
          <div key={exp.id} className="experience-item">
            <h3 style={{margin: '0 0 0.5rem 0'}}>{exp.title} at {exp.company}</h3>
            <p style={{margin: '0 0 0.5rem 0', color: '#666'}}>{exp.startDate} - {exp.endDate}</p>
            <p>{exp.description}</p>
            <div style={{marginTop: '1rem'}}>
               <button className="btn-secondary" onClick={() => editExperience(exp)}>Edit</button>
               <button className="btn-secondary" onClick={() => deleteExperience(exp.id)} style={{marginLeft: '0.5rem', color: '#ef4444', background: '#ffebeb'}}>Delete</button>
            </div>
          </div>
        ))}
        
        {!showExpForm ? (
          <button className="btn-secondary" onClick={() => setShowExpForm(true)}>+ Add Experience</button>
        ) : (
          <div className="experience-form" style={{background: '#f9fafb', padding: '1rem', borderRadius: '8px'}}>
            <input className="form-input" placeholder="Job Title" value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} style={{marginBottom: '0.5rem'}} />
            <input className="form-input" placeholder="Company" value={expForm.company} onChange={e => setExpForm({...expForm, company: e.target.value})} style={{marginBottom: '0.5rem'}} />
            <div style={{display: 'flex', gap: '1rem'}}>
               <input className="form-input" type="date" value={expForm.startDate} onChange={e => setExpForm({...expForm, startDate: e.target.value})} style={{marginBottom: '0.5rem'}} />
               <input className="form-input" type="date" value={expForm.endDate} onChange={e => setExpForm({...expForm, endDate: e.target.value})} style={{marginBottom: '0.5rem'}} />
            </div>
            <textarea className="form-input" placeholder="Description" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} style={{marginBottom: '0.5rem'}} rows={3} />
            <div style={{marginTop: '1rem'}}>
              <button className="btn-primary" onClick={saveExperience}>Save</button>
              <button className="btn-secondary" onClick={() => setShowExpForm(false)} style={{marginLeft: '0.5rem'}}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="profile-section">
         <h2 className="section-title">Resume Preview</h2>
         {userData?.resumeFileUrl ? (
            <iframe src={userData.resumeFileUrl} width="100%" height="400px" title="Resume" style={{border: '1px solid #ccc', borderRadius: '4px'}} />
         ) : (
            <p>No resume uploaded. Upload one in the onboarding flow.</p>
         )}
      </div>

      <button className="btn-primary" onClick={handleSave} style={{width: '100%', marginTop: '1rem', height: '3rem', fontSize: '1.1rem'}}>
        Save Profile Changes
      </button>
    </div>
  );
}