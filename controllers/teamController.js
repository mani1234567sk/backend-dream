import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageTeamsScreen({ navigation }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    captain: '',
    password: '',
    logo: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  const { API_BASE_URL } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');
        console.log('Token:', token, 'UserRole:', userRole); // Debug auth
        setIsAdmin(userRole === 'admin' && token);
        if (token) {
          fetchTeams(token);
        } else {
          Alert.alert('Error', 'No authentication token found. Please log in.');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        Alert.alert('Error', 'Failed to verify user status.');
      }
    };
    checkAdminStatus();
  }, []);

  const fetchTeams = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Team name is required';
    if (!formData.captain.trim()) errors.captain = 'Captain name is required';
    if (!editMode && !formData.password.trim()) errors.password = 'Password is required';
    if (!editMode && formData.password.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openModal = (team = null) => {
    if (!isAdmin) {
      Alert.alert('Error', 'You do not have permission to perform this action.');
      return;
    }
    setEditMode(!!team);
    setEditingTeam(team);
    setFormData(
      team
        ? {
            name: team.name || '',
            captain: team.captain || '',
            password: '',
            logo: team.logo || '',
            email: team.email || '',
          }
        : {
            name: '',
            captain: '',
            password: '',
            logo: '',
            email: '',
          }
    );
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the form errors before submitting');
      return;
    }

    const sanitizedFormData = {
      name: formData.name.trim().replace(/\s+/g, ' '),
      captain: formData.captain.trim().replace(/\s+/g, ' '),
      password: !editMode ? formData.password.trim() : undefined,
      logo: formData.logo ? formData.logo.trim() : 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg',
      email: formData.email ? formData.email.trim().toLowerCase() : '',
    };

    console.log('Sending request to:', `${API_BASE_URL}/teams`);
    console.log('Payload:', sanitizedFormData);

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      console.log('Token:', token); // Debug token
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (editMode) {
        const { password, ...updateData } = sanitizedFormData;
        await axios.put(`${API_BASE_URL}/teams/${editingTeam._id}`, updateData, config);
        Alert.alert('Success', 'Team updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/teams`, sanitizedFormData, config);
        Alert.alert('Success', 'Team created successfully!');
      }

      setShowModal(false);
      setEditMode(false);
      setEditingTeam(null);
      setFormData({
        name: '',
        captain: '',
        password: '',
        logo: '',
        email: '',
      });
      setFormErrors({});
      fetchTeams(token);
    } catch (error) {
      console.error('Error saving team:', error);
      console.error('Full error response:', error.response?.data); // Add this
      const message =
        error.response?.data?.code === 11000
          ? `A team with this ${Object.keys(error.response.data.details?.keyPattern || {})[0] || 'field'} already exists: ${JSON.stringify(error.response.data.details?.keyValue || {})}`
          : error.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} team`;
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id) => {
    if (!isAdmin) {
      Alert.alert('Error', 'You do not have permission to delete teams.');
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this team?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
              throw new Error('No authentication token found. Please log in.');
            }
            await axios.delete(`${API_BASE_URL}/teams/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchTeams(token);
            Alert.alert('Success', 'Team deleted successfully');
          } catch (error) {
            console.error('Error deleting team:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete team');
          }
        },
      },
    ]);
  };

  const updateFormData = (key, value) => {
    let sanitizedValue = value;
    if (typeof value === 'string') {
      sanitizedValue = value.trim().replace(/\s+/g, ' ');
      if (key === 'email') {
        sanitizedValue = sanitizedValue.toLowerCase();
      }
    }
    setFormData((prev) => ({ ...prev, [key]: sanitizedValue }));
    setFormErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const renderTeamItem = ({ item }) => (
    <View style={styles.teamItem}>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{item.name} (ID: {item._id.slice(0, 6)})</Text>
        <Text style={styles.teamCaptain}>Captain: {item.captain}</Text>
        {item.email && (
          <Text style={styles.teamEmail}>Email: {item.email}</Text>
        )}
        <Text style={styles.teamDetails}>
          Players: {item.players?.length || 0} | Matches: {item.matchesPlayed || 0} | Wins: {item.wins || 0}
        </Text>
        {item.currentLeague && (
          <Text style={styles.teamLeague}>League: {item.currentLeague.name}</Text>
        )}
      </View>
      {isAdmin && (
        <View style={styles.teamActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openModal(item)}
          >
            <Ionicons name="pencil-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteTeam(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Teams</Text>
        {isAdmin && (
          <ImageBackground
            source={require('./vector.png')}
            style={styles.addButton}
            imageStyle={styles.buttonImage}
          >
            <TouchableOpacity
              style={styles.addButtonTouchable}
              onPress={() => openModal()}
            >
              <Ionicons name="add" size={24} color="#ffd700" />
              <Text style={styles.addButtonText}>Add Team</Text>
            </TouchableOpacity>
          </ImageBackground>
        )}
      </View>

      <FlatList
        data={teams}
        renderItem={renderTeamItem}
        keyExtractor={(item) => item._id}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={64} color="#888" />
            <Text style={styles.emptyText}>No teams found</Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editMode ? 'Edit Team' : 'Add Team'}
            </Text>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, formErrors.name ? styles.inputError : null]}
                  placeholder="Team Name *"
                  placeholderTextColor="#888"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, formErrors.captain ? styles.inputError : null]}
                  placeholder="Captain Name *"
                  placeholderTextColor="#888"
                  value={formData.captain}
                  onChangeText={(value) => updateFormData('captain', value)}
                />
                {formErrors.captain && <Text style={styles.errorText}>{formErrors.captain}</Text>}
              </View>
              {!editMode && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, formErrors.password ? styles.inputError : null]}
                    placeholder="Team Password *"
                    placeholderTextColor="#888"
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry
                  />
                  {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
                </View>
              )}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Logo URL (optional)"
                  placeholderTextColor="#888"
                  value={formData.logo}
                  onChangeText={(value) => updateFormData('logo', value)}
                />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, formErrors.email ? styles.inputError : null]}
                  placeholder="Team Email (optional)"
                  placeholderTextColor="#888"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <ImageBackground
                source={require('./vector.png')}
                style={[styles.modalButton, styles.confirmButton]}
                imageStyle={styles.buttonImage}
              >
                <TouchableOpacity
                  style={styles.confirmButtonTouchable}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.confirmButtonText}>
                    {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update' : 'Create')}
                  </Text>
                </TouchableOpacity>
              </ImageBackground>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d2818',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cocogoose-Pro-Bold-Italic',
    color: '#ffd700',
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  addButton: {
    borderRadius: 8,
    height: 40,
    borderWidth: 2,
    borderColor: '#ffd700',
    overflow: 'hidden',
    maxWidth: '40%',
    minWidth: 120,
  },
  buttonImage: {
    opacity: 0.3,
  },
  addButtonTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#ffd700',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 44,
    flexShrink: 1,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a4d3a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontFamily: 'Cocogoose-Pro-Bold-Italic',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  teamCaptain: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: '#aaa',
    marginBottom: 4,
  },
  teamEmail: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: '#aaa',
    marginBottom: 4,
  },
  teamDetails: {
    fontSize: 12,
    fontFamily: 'LemonMilk-Regular',
    color: '#888',
    marginBottom: 2,
  },
  teamLeague: {
    fontSize: 12,
    fontFamily: 'LemonMilk-Regular',
    color: '#ffd700',
  },
  teamActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a4d3a',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Cocogoose-Pro-Bold-Italic',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalForm: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0d2818',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a5d4a',
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#888',
  },
  confirmButton: {
    borderWidth: 2,
    borderColor: '#ffd700',
    overflow: 'hidden',
  },
  confirmButtonTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  confirmButtonText: {
    color: '#ffd700',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
          
