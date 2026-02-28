import React, { useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useUserManagementController } from '../../controllers';
import type { ManagedUser, AdminStackParamList } from '../../models';

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Checkbox ───
const Checkbox: React.FC<{ checked: boolean; onPress: () => void }> = ({
  checked,
  onPress,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <TouchableOpacity
    style={[styles.checkbox, checked && styles.checkboxChecked]}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    {checked && <Ionicons name="checkmark" size={14} color={tc.white} />}
  </TouchableOpacity>
  );
};

// ─── Table Header ───
const TableHeader: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={styles.tableHeader}>
    <View style={styles.colCheck} />
    <View style={styles.colId}>
      <Text style={styles.colTitle}>User ID</Text>
    </View>
    <View style={styles.colName}>
      <Text style={styles.colTitle}>Name</Text>
      <Text style={styles.colSub}>String | MAX – Length 65</Text>
    </View>
    <View style={styles.colEmail}>
      <Text style={styles.colTitle}>Email</Text>
      <Text style={styles.colSub}>String | MAX – Length 65</Text>
    </View>
  </View>
  );
};

// ─── Table Row ───
const TableRow: React.FC<{
  user: ManagedUser;
  selected: boolean;
  onToggle: () => void;
}> = ({ user, selected, onToggle }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <TouchableOpacity
    style={[styles.tableRow, selected && styles.tableRowSelected]}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={styles.colCheck}>
      <Checkbox checked={selected} onPress={onToggle} />
    </View>
    <View style={styles.colId}>
      <Text
        style={[styles.cellText, selected && styles.cellTextSelected]}
        numberOfLines={1}
      >
        {user.userId}
      </Text>
    </View>
    <View style={styles.colName}>
      <Text
        style={[styles.cellTextBold, selected && styles.cellTextSelected]}
        numberOfLines={1}
      >
        {user.fullName}
      </Text>
    </View>
    <View style={styles.colEmail}>
      <Text
        style={[styles.cellText, selected && styles.cellTextSelected]}
        numberOfLines={1}
      >
        {user.email}
      </Text>
    </View>
  </TouchableOpacity>
  );
};

// ─── Add / Edit User Modal ───
const UserFormModal: React.FC<{
  visible: boolean;
  title: string;
  initialName?: string;
  initialEmail?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
}> = ({ visible, title, initialName = '', initialEmail = '', loading: submitting, onClose, onSubmit }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setEmail(initialEmail);
    }
  }, [visible, initialName, initialEmail]);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSubmit(name.trim(), email.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Full Name</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter full name"
            placeholderTextColor={tc.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={65}
          />

          <Text style={styles.modalLabel}>Email</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter email"
            placeholderTextColor={tc.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={65}
          />

          <TouchableOpacity
            style={[
              styles.modalSubmitBtn,
              (!name.trim() || !email.trim()) && styles.modalSubmitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !email.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color={tc.white} size="small" />
            ) : (
              <Text style={styles.modalSubmitText}>{title === 'Add User' ? 'Add' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const AdminUserManagementScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const {
    users,
    selectedUids,
    loading,
    error,
    searchId,
    hasMore,
    setSearchId,
    searchUser,
    toggleSelect,
    addUser,
    editUser,
    deleteSelected,
    fetchMore,
  } = useUserManagementController();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  const handleSearch = () => searchUser(searchId);

  const handleAdd = async (name: string, email: string) => {
    await addUser(name, email);
    setAddModalVisible(false);
  };

  const handleEdit = async (name: string, email: string) => {
    if (!editingUser) return;
    await editUser(editingUser.uid, name, email);
    setEditModalVisible(false);
    setEditingUser(null);
  };

  const handleContinue = () => {
    // If exactly one user is selected, navigate to detail screen
    if (selectedUids.size === 1) {
      const uid = Array.from(selectedUids)[0];
      navigation.navigate('AdminUserDetail', { uid });
    }
  };

  const handleDelete = () => {
    if (selectedUids.size === 0) return;
    Alert.alert(
      'Delete Users',
      `Are you sure you want to delete ${selectedUids.size} selected user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteSelected,
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Search + Action Buttons ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="user_ID"
            placeholderTextColor={tc.textMuted}
            value={searchId}
            onChangeText={setSearchId}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchIconBtn}>
            <Ionicons name="search" size={16} color={tc.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, selectedUids.size === 0 && styles.actionBtnDisabled]}
            onPress={handleContinue}
            disabled={selectedUids.size === 0}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.actionBtnText,
                selectedUids.size === 0 && styles.actionBtnTextDisabled,
              ]}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Instruction ── */}
      <Text style={styles.instruction}>Select any user to edit/delete/add</Text>

      {/* ── Delete Button (shows when selection > 0) ── */}
      {selectedUids.size > 0 && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={16} color={tc.white} />
          <Text style={styles.deleteBtnText}>
            Delete {selectedUids.size} selected
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Error ── */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Table ── */}
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <TableHeader />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.tableBody}
            >
              {users.map((user) => (
                <TableRow
                  key={user.uid}
                  user={user}
                  selected={selectedUids.has(user.uid)}
                  onToggle={() => toggleSelect(user.uid)}
                />
              ))}

              {loading && (
                <ActivityIndicator
                  size="small"
                  color={tc.accent}
                  style={{ marginVertical: 16 }}
                />
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* ── Load More ── */}
      {hasMore && !loading && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} activeOpacity={0.7}>
          <Text style={styles.loadMoreText}>search 500+ more...</Text>
        </TouchableOpacity>
      )}

      {/* ── Modals ── */}
      <UserFormModal
        visible={addModalVisible}
        title="Add User"
        loading={loading}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAdd}
      />
      <UserFormModal
        visible={editModalVisible}
        title="Edit User"
        initialName={editingUser?.fullName}
        initialEmail={editingUser?.email}
        loading={loading}
        onClose={() => {
          setEditModalVisible(false);
          setEditingUser(null);
        }}
        onSubmit={handleEdit}
      />
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const COL_CHECK_W = 40;
const COL_ID_W = 64;
const COL_NAME_W = 130;
const COL_EMAIL_W = 180;

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
  },
  headerSpacer: { width: 32 },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.accentMuted,
    borderRadius: 24,
    paddingHorizontal: 18,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  searchIconBtn: {
    padding: 4,
  },
  actionBtns: {
    gap: 6,
  },
  actionBtn: {
    backgroundColor: tc.surface,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: tc.text,
  },
  actionBtnTextDisabled: {
    color: tc.textMuted,
  },

  // Instruction
  instruction: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },

  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: tc.error,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 20,
    marginBottom: 6,
    gap: 6,
  },
  deleteBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: tc.white,
  },

  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.error,
    paddingHorizontal: 20,
    marginBottom: 6,
  },

  // Table
  tableContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  tableBody: {
    paddingBottom: 12,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: tc.divider,
    paddingBottom: 8,
    marginBottom: 2,
  },
  colCheck: { width: COL_CHECK_W, alignItems: 'center', justifyContent: 'center' },
  colId: { width: COL_ID_W, paddingRight: 4 },
  colName: { width: COL_NAME_W, paddingRight: 4 },
  colEmail: { width: COL_EMAIL_W },
  colTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: tc.text,
  },
  colSub: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: tc.textMuted,
    marginTop: 1,
  },

  // Table row
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: tc.divider,
  },
  tableRowSelected: {
    backgroundColor: tc.accentMuted,
    borderRadius: 6,
  },
  cellText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.text,
  },
  cellTextBold: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.text,
  },
  cellTextSelected: {
    color: tc.accent,
  },

  // Checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: tc.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tc.white,
  },
  checkboxChecked: {
    backgroundColor: tc.accent,
    borderColor: tc.accent,
  },

  // Load more
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loadMoreText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.accent,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: tc.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tc.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
  },
  modalLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tc.inputBg,
  },
  modalSubmitBtn: {
    backgroundColor: tc.accent,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.white,
  },
});

export default AdminUserManagementScreen;
