import { Button, Section, TextField, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text } from "react-native";

export function TextFieldSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <Section title="✏️ Text Fields">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Basic Text Field</Text>
        <TextField
          defaultValue=""
          placeholder="Enter your name"
          onValueChange={setName}
        />
        <Text style={{ fontSize: 12, color: "gray" }}>{`Name: ${name || "(empty)"}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Email Keyboard</Text>
        <TextField
          defaultValue=""
          placeholder="Enter your email"
          onValueChange={setEmail}
        />
        <Text style={{ fontSize: 12, color: "gray" }}>{`Email: ${email || "(empty)"}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Phone Number</Text>
        <TextField
          defaultValue=""
          placeholder="Enter phone number"
          onValueChange={setPhone}
        />
        <Text style={{ fontSize: 12, color: "gray" }}>{`Phone: ${phone || "(empty)"}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Multiline Text Field</Text>
        <TextField
          defaultValue=""
          placeholder="Tell us about yourself..."
          onValueChange={setBio}
        />
        <Text style={{ fontSize: 12, color: "gray" }}>{`Bio: ${bio.length} characters`}</Text>

        <Button
          onPress={() => {
            console.log({ name, email, phone, bio });
          }}
        >
          <Text>Submit Form</Text>
        </Button>
      </VStack>
    </Section>
  );
}
