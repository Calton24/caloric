import { Button, Section, Text, TextField, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function TextFieldSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <Section title="✏️ Text Fields">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Basic Text Field
        </Text>
        <TextField
          defaultValue=""
          placeholder="Enter your name"
          onChangeText={setName}
        />
        <Text size={12} color="gray">
          {`Name: ${name || "(empty)"}`}
        </Text>

        <Text size={14} color="gray">
          Email Keyboard
        </Text>
        <TextField
          defaultValue=""
          placeholder="Enter your email"
          keyboardType="email-address"
          autocorrection={false}
          onChangeText={setEmail}
        />
        <Text size={12} color="gray">
          {`Email: ${email || "(empty)"}`}
        </Text>

        <Text size={14} color="gray">
          Phone Number
        </Text>
        <TextField
          defaultValue=""
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          onChangeText={setPhone}
        />
        <Text size={12} color="gray">
          {`Phone: ${phone || "(empty)"}`}
        </Text>

        <Text size={14} color="gray">
          Multiline Text Field
        </Text>
        <TextField
          defaultValue=""
          placeholder="Tell us about yourself..."
          multiline={true}
          numberOfLines={4}
          onChangeText={setBio}
        />
        <Text size={12} color="gray">
          {`Bio: ${bio.length} characters`}
        </Text>

        <Button
          variant="bordered"
          onPress={() => {
            console.log({ name, email, phone, bio });
          }}
        >
          Submit Form
        </Button>
      </VStack>
    </Section>
  );
}
