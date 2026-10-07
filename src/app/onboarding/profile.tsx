import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { NavHeader } from '@/components/nav-header';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Txt } from '@/components/text';
import { useStore } from '@/store/store';
import { colors, space } from '@/theme';

export default function Profile() {
  const { state, updateProfile } = useStore();
  const [name, setName] = useState(state.name);
  const next = () => {
    updateProfile({ name: name.trim() });
    router.push('/onboarding/track');
  };
  return (
    <Screen footer={<Button label="Continue" onPress={next} disabled={!name.trim()} />}>
      <NavHeader />
      <View style={{ gap: space.xs }}>
        <Txt variant="display" style={{ fontSize: 28, lineHeight: 34 }}>First things first —{'\n'}what should we call you?</Txt>
        <Txt variant="body" style={{ color: colors.ink60 }}>Just a first name is perfect.</Txt>
      </View>
      <TextField
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={() => name.trim() && next()}
        maxLength={24}
        style={{ fontSize: 20, height: 64 }}
      />
    </Screen>
  );
}
