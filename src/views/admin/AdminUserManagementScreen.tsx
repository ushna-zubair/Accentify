import React, { useState, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const styles = useMemo(() => createStyles(tc, 400), [tc]);
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
const TableHeader: React.FC<{ isWide: boolean }> = ({ isWide }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, isWide ? 900 : 400), [tc, isWide]);
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
      {isWide && (
        <View style={styles.colActions}>
          <Text style={styles.colTitle}>Actions</Text>
        </View>
      )}
    </View>
  );
};

// ─── Table Row ───
const TableRow: React.FC<{
  user: ManagedUser;
  selected: boolean;
  onToggle: () => void;
  isWide: boolean;
  onViewDetail: () => void;
  onEditUser: () => void;
}> = ({ user, selected, onToggle, isWide, onViewDetail, onEditUser }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc, isWide ? 900 : 400), [tc, isWide]);
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
      {isWide && (
        <View style={styles.colActions}>
          <TouchableOpacity
            style={styles.rowActionBtn}
            onPress={onViewDetail}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color={tc.accent} />
            <Text style={styles.rowActionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rowActionBtn}
            onPress={onEditUser}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={tc.textLight} />
            <Text style={[styles.rowActionText, { color: tc.textLight }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= 600;
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
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
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'}>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, isWeb && styles.modalOverlayCenter]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalContent, isWeb && styles.modalContentWeb]}>
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width >= 600;
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
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
    if (selectedUids.size === 1) {
      const uid = Array.from(selectedUids)[0];
      navigation.navigate('AdminUserDetail', { uid });
    }
  };

  const handleDelete = () => {
    if (selectedUids.size === 0) return;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Are you sure you want to delete ${selectedUids.size} selected user(s)?`)) {
        deleteSelected();
      }
    } else {
      Alert.alert(
        'Delete Users',
        `Are you sure you want to delete ${selectedUids.size} selected user(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: deleteSelected },
        ],
      );
    }
  };

  const handleViewDetail = (uid: string) => {
    navigation.navigate('AdminUserDetail', { uid });
  };

  const handleEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setEditModalVisible(true);
  };

  // ── Mobile User Card ──
  const renderMobileUserCard = (user: ManagedUser) => {
    const isSelected = selectedUids.has(user.uid);
    const initials = user.fullName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        key={user.uid}
        style={[styles.userCard, isSelected && styles.userCardSelected]}
        onPress={() => toggleSelect(user.uid)}
        activeOpacity={0.7}
      >
        <View style={styles.userCardTop}>
          <View style={styles.userCardLeft}>
            <View style={[styles.userAvatar, isSelected && styles.userAvatarSelected]}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View style={styles.userCardInfo}>
              <Text style={[styles.userCardName, isSelected && styles.userCardNameSelected]} numberOfLines={1}>
                {user.fullName}
              </Text>
              <Text style={styles.userCardEmail} numberOfLines={1}>{user.email}</Text>
            </View>
          </View>
          <Checkbox checked={isSelected} onPress={() => toggleSelect(user.uid)} />
        </View>
        <View style={styles.userCardBottom}>
          <Text style={styles.userCardId} numberOfLines={1}>ID: {user.userId}</Text>
          <View style={styles.userCardActions}>
            <TouchableOpacity
              style={styles.userCardActionBtn}
              onPress={() => handleViewDetail(user.uid)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={16} color={tc.accent} />
              <Text style={styles.userCardActionText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.userCardActionBtn}
              onPress={() => handleEditUser(user)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={tc.textLight} />
              <Text style={[styles.userCardActionText, { color: tc.textLight }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      {!isWide && (
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* ── Web Page Title ── */}
      {isWide && (
        <Text style={styles.pageTitle}>Manage Users</Text>
      )}

      {/* ── Toolbar: Search + Actions ── */}
      <View style={styles.toolbar}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={tc.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by User ID"
            placeholderTextColor={tc.textMuted}
            value={searchId}
            onChangeText={setSearchId}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchIconBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={tc.white} />
            <Text style={styles.addBtnText}>Add User</Text>
          </TouchableOpacity>
          {!isWide && selectedUids.size > 0 && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleContinue}
              disabled={selectedUids.size !== 1}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={16} color={tc.accent} />
              <Text style={styles.actionBtnText}>Detail</Text>
            </TouchableOpacity>
          )}
          {selectedUids.size > 0 && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={tc.white} />
              <Text style={styles.deleteBtnText}>
                Delete ({selectedUids.size})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{selectedUids.size}</Text>
          <Text style={styles.statLabel}>Selected</Text>
        </View>
      </View>

      {/* ── Error ── */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Content: Card list on mobile, Table on desktop ── */}
      {!isWide ? (
        <ScrollView
          style={styles.userListScroll}
          contentContainerStyle={styles.userListContent}
          showsVerticalScrollIndicator={false}
        >
          {users.length === 0 && !loading && (
            <View style={styles.emptyRow}>
              <Ionicons name="people-outline" size={40} color={tc.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubText}>Add users or adjust your search</Text>
            </View>
          )}
          {users.map(renderMobileUserCard)}
          {loading && (
            <ActivityIndicator size="small" color={tc.accent} style={{ marginVertical: 16 }} />
          )}
          {hasMore && !loading && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} activeOpacity={0.7}>
              <Text style={styles.loadMoreText}>Load more users...</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <>
          <View style={styles.tableCard}>
            <View style={styles.tableContainer}>
              <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
                <View style={{ flex: 1, minWidth: isWide ? '100%' as unknown as number : undefined }}>
                  <TableHeader isWide={isWide} />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.tableBody}
                  >
                    {users.length === 0 && !loading && (
                      <View style={styles.emptyRow}>
                        <Ionicons name="people-outline" size={32} color={tc.textMuted} />
                        <Text style={styles.emptyText}>No users found</Text>
                      </View>
                    )}
                    {users.map((user) => (
                      <TableRow
                        key={user.uid}
                        user={user}
                        selected={selectedUids.has(user.uid)}
                        onToggle={() => toggleSelect(user.uid)}
                        isWide={isWide}
                        onViewDetail={() => handleViewDetail(user.uid)}
                        onEditUser={() => handleEditUser(user)}
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
          </View>

          {/* ── Load More ── */}
          {hasMore && !loading && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={fetchMore} activeOpacity={0.7}>
              <Text style={styles.loadMoreText}>Load more users...</Text>
            </TouchableOpacity>
          )}
        </>
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

const createStyles = (tc: ThemeColors, screenWidth: number) => {
  const isWide = Platform.OS === 'web' && screenWidth >= 600;
  const COL_CHECK_W = 44;
  const COL_ID_W = isWide ? 100 : 64;
  const COL_NAME_W = isWide ? 200 : 130;
  const COL_EMAIL_W = isWide ? 260 : 180;
  const COL_ACTIONS_W = isWide ? 160 : 0;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isWide ? '#F5F6FA' : tc.surfaceAlt,
    },

    // Header (mobile only)
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
      backgroundColor: tc.white,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    headerSpacer: { width: 36 },

    // Page title (web)
    pageTitle: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: tc.text,
      paddingHorizontal: isWide ? 32 : 20,
      paddingTop: isWide ? 28 : 16,
      paddingBottom: 4,
    },

    // Toolbar
    toolbar: {
      flexDirection: isWide ? 'row' : 'column',
      alignItems: isWide ? 'center' : 'stretch',
      paddingHorizontal: isWide ? 32 : 16,
      marginTop: isWide ? 16 : 12,
      gap: 10,
    },
    searchInputWrapper: {
      flex: isWide ? 1 : undefined,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.white,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: isWide ? 46 : 44,
      borderWidth: 1,
      borderColor: tc.cardBorder,
      maxWidth: isWide ? 420 : undefined,
    },
    searchInput: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.text,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    searchIconBtn: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      backgroundColor: tc.accent,
      borderRadius: 8,
      marginLeft: 8,
    },
    searchBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: tc.white,
    },
    actionBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 6,
    },
    addBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.white,
    },
    actionBtn: {
      flexDirection: 'row',
      backgroundColor: tc.white,
      borderWidth: 1,
      borderColor: tc.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 4,
    },
    actionBtnDisabled: {
      opacity: 0.5,
    },
    actionBtnText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.accent,
    },
    actionBtnTextDisabled: {
      color: tc.textMuted,
    },

    // Stats Bar (mobile)
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: tc.white,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.accent,
    },
    statLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textLight,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: tc.divider,
      marginHorizontal: 16,
    },

    // Delete
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.error,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 6,
    },
    deleteBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: tc.white,
    },

    errorText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.error,
      paddingHorizontal: isWide ? 32 : 16,
      marginBottom: 6,
    },

    // ── Mobile User Cards ──
    userListScroll: {
      flex: 1,
    },
    userListContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 10,
    },
    userCard: {
      backgroundColor: tc.white,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    userCardSelected: {
      borderColor: tc.accent,
      backgroundColor: tc.accentMuted,
    },
    userCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    userAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: tc.accentLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userAvatarSelected: {
      backgroundColor: tc.accent,
    },
    userAvatarText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: tc.white,
    },
    userCardInfo: {
      flex: 1,
    },
    userCardName: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: tc.text,
    },
    userCardNameSelected: {
      color: tc.accent,
    },
    userCardEmail: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: tc.textLight,
      marginTop: 2,
    },
    userCardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: tc.divider,
    },
    userCardId: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textMuted,
      flex: 1,
    },
    userCardActions: {
      flexDirection: 'row',
      gap: 4,
    },
    userCardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: tc.surfaceAlt,
    },
    userCardActionText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.accent,
    },

    // ── Desktop Table (unchanged) ──
    tableCard: {
      flex: 1,
      marginHorizontal: isWide ? 32 : 0,
      backgroundColor: isWide ? tc.white : 'transparent',
      borderRadius: isWide ? 14 : 0,
      borderWidth: isWide ? 1 : 0,
      borderColor: tc.cardBorder,
      ...(isWide && Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
          }
        : {}),
      overflow: 'hidden',
    },
    tableContainer: {
      flex: 1,
      paddingHorizontal: isWide ? 8 : 12,
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
      paddingBottom: 10,
      paddingHorizontal: isWide ? 8 : 0,
      marginBottom: 2,
      backgroundColor: isWide ? tc.surfaceAlt : 'transparent',
    },
    colCheck: { width: COL_CHECK_W, alignItems: 'center', justifyContent: 'center' },
    colId: { width: COL_ID_W, paddingRight: 4 },
    colName: { width: COL_NAME_W, paddingRight: 4 },
    colEmail: { flex: isWide ? 1 : undefined, width: isWide ? undefined : COL_EMAIL_W },
    colActions: { width: COL_ACTIONS_W, alignItems: 'center' },
    colTitle: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: tc.text,
    },
    colSub: {
      fontFamily: fonts.regular,
      fontSize: 9,
      color: tc.textMuted,
      marginTop: 1,
    },

    // Table row
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isWide ? 12 : 10,
      paddingHorizontal: isWide ? 8 : 0,
      borderBottomWidth: 0.5,
      borderBottomColor: tc.divider,
    },
    tableRowSelected: {
      backgroundColor: tc.accentMuted,
      borderRadius: 8,
    },
    cellText: {
      fontFamily: fonts.regular,
      fontSize: isWide ? 14 : 12,
      color: tc.text,
    },
    cellTextBold: {
      fontFamily: fonts.semiBold,
      fontSize: isWide ? 14 : 13,
      color: tc.text,
    },
    cellTextSelected: {
      color: tc.accent,
    },

    // Row actions (web)
    rowActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    rowActionText: {
      fontFamily: fonts.medium,
      fontSize: 12,
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

    // Empty state
    emptyRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
      gap: 8,
    },
    emptyText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: tc.textMuted,
    },
    emptySubText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textMuted,
    },

    // Load more
    loadMoreBtn: {
      alignSelf: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 20,
      backgroundColor: tc.white,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tc.accent,
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
    modalOverlayCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: tc.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalContentWeb: {
      borderRadius: 20,
      width: '100%',
      maxWidth: 440,
      paddingBottom: 28,
      ...(Platform.OS === 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
          }
        : {}),
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
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    modalSubmitBtn: {
      backgroundColor: tc.accent,
      borderRadius: 14,
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
};

export default AdminUserManagementScreen;
